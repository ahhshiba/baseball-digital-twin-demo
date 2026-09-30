"""Monocular 3D estimate of a pitch from one calibrated camera.

One camera gives a ray per detection, not a point; a second constraint is needed:
  * plane: the ball stays in the vertical plane x = x_plane (mound–home line). Error grows with lateral break.
  * size:  depth from apparent radius, Z = f·r / r_px. Error grows fast when the ball is only a few pixels.
  * model: fit p0, v0, a of a constant-acceleration flight directly to the 2D track (reprojection + apparent
           radius + weak physical priors), initialised from plane/size. Uses perspective change along the path.
The method is chosen per clip from the viewing geometry. Outputs are estimates, never direct measurements.
"""
from __future__ import annotations
import numpy as np
from .camera import Camera, BALL_RADIUS_M, PLATE_PLANE_Y

# Physical plausibility of a fitted pitch (world metres, m/s²). A fit outside these is rejected, not reported.
PLAUSIBLE = {'first_y': (10.0, 19.5), 'first_z': (0.4, 2.8), 'first_x': (-2.0, 2.0),
             'a_x': (-15.0, 15.0), 'a_y': (-5.0, 12.0), 'a_z': (-30.0, 5.0)}


def implausible(coef, t_first):
    p = coef[0] + coef[1] * t_first + 0.5 * coef[2] * t_first ** 2
    checks = {'first_x': p[0], 'first_y': p[1], 'first_z': p[2], 'a_x': coef[2][0], 'a_y': coef[2][1], 'a_z': coef[2][2]}
    return [k for k, v in checks.items() if not PLAUSIBLE[k][0] <= v <= PLAUSIBLE[k][1]]


X_SIGMA_LIMIT_CM = 5.0  # report lateral plate position only when the fit constrains it this well


def choose_method(cam: Camera, uv_mid):
    d = cam.ray(np.atleast_2d(uv_mid))[0]
    return 'plane' if abs(d[0]) > 0.35 else 'size'


def points_3d(cam: Camera, track, method, x_plane=0.0):
    uv = np.array([[c['u'], c['v']] for _, c in track])
    rays, C = cam.ray(uv), cam.center
    if method == 'plane':
        s = (x_plane - C[0]) / rays[:, 0]
    elif method == 'size':
        r = np.array([max(c['radius_px'], 0.5) for _, c in track])
        z_cam = cam.K[0, 0] * BALL_RADIUS_M / r          # depth along the optical axis
        fwd = cam.R[2]
        s = z_cam / (rays @ fwd)
    else:
        raise ValueError(method)
    return C + rays * s[:, None]


def fit_constant_acceleration(t, P, iterations=3):
    """Weighted least squares p(t)=p0+v0·t+½a·t² per axis with residual-based outlier rejection."""
    t = np.asarray(t, float)
    keep = np.ones(len(t), bool)
    A = np.column_stack([np.ones_like(t), t, 0.5 * t ** 2])
    for _ in range(iterations):
        coef, *_ = np.linalg.lstsq(A[keep], P[keep], rcond=None)
        res = np.linalg.norm(A @ coef - P, axis=1)
        mad = np.median(np.abs(res[keep] - np.median(res[keep]))) + 1e-9
        new_keep = res <= np.median(res[keep]) + 4 * 1.4826 * mad
        if new_keep.sum() < 5 or np.array_equal(new_keep, keep):
            break
        keep = new_keep
    return coef, keep, res


def plate_crossing(coef, t_start):
    """Solve y(t) = PLATE_PLANE_Y for the first root after t_start."""
    p0, v0, a = coef[0, 1], coef[1, 1], coef[2, 1]
    roots = np.roots([0.5 * a, v0, p0 - PLATE_PLANE_Y]) if abs(a) > 1e-9 else np.array([(PLATE_PLANE_Y - p0) / v0])
    roots = np.real(roots[np.isreal(roots)])
    roots = roots[roots >= t_start - 1e-6]
    return float(roots.min()) if len(roots) else None


def refine_model(cam: Camera, track, times, coef0, sigma_px=0.5, iters=40):
    """Levenberg–Marquardt on theta=[p0,v0,a] (t relative to the first detection); numerical Jacobian."""
    t = np.array([times[i] for i, _ in track]); t = t - t[0]
    uv = np.array([[c['u'], c['v']] for _, c in track])
    r_obs = np.array([c['radius_px'] for _, c in track])
    sig_r = 0.3 + 0.15 * r_obs  # blur and anti-aliasing bias the minor-axis radius
    def residual(th):
        p0, v0, a = th[:3], th[3:6], th[6:]
        X = p0 + np.outer(t, v0) + 0.5 * np.outer(t ** 2, a)
        pr, z = cam.project(X)
        if np.any(z <= 0.1) or not np.all(np.isfinite(pr)):
            return None
        rr = cam.K[0, 0] * BALL_RADIUS_M / z
        # Weak priors: vertical accel near gravity ± Magnus, along-pitch drag small, lateral break bounded.
        prior = [(a[2] + 9.8) / 10.0, (a[1] - 1.5) / 5.0, a[0] / 12.0]
        return np.concatenate([((pr - uv) / sigma_px).ravel(), (rr - r_obs) / sig_r, prior])
    th = np.concatenate([coef0[0] + coef0[1] * 0, coef0[1], coef0[2]])
    th[:3] = coef0[0] + coef0[1] * times[track[0][0]] + 0.5 * coef0[2] * times[track[0][0]] ** 2
    th[3:6] = coef0[1] + coef0[2] * times[track[0][0]]
    r = residual(th)
    if r is None:
        return None
    lam, cost = 1e-3, float(r @ r)
    for _ in range(iters):
        J = np.empty((len(r), 9))
        for k in range(9):
            d = np.zeros(9); d[k] = 1e-5 * max(1.0, abs(th[k]))
            rk = residual(th + d)
            if rk is None:
                return None
            J[:, k] = (rk - r) / d[k]
        A, g = J.T @ J, J.T @ r
        step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
        r_new = residual(th + step)
        if r_new is not None and float(r_new @ r_new) < cost:
            th, r, lam = th + step, r_new, lam * 0.3
            if cost - float(r @ r) < 1e-9 * cost:
                cost = float(r @ r); break
            cost = float(r @ r)
        else:
            lam *= 10
            if lam > 1e8:
                break
    # Covariance of theta from the normalised residuals (Gauss–Newton approximation), rescaled by fit quality.
    J = np.empty((len(r), 9))
    for k in range(9):
        d = np.zeros(9); d[k] = 1e-5 * max(1.0, abs(th[k]))
        rk = residual(th + d)
        J[:, k] = (rk - r) / d[k] if rk is not None else 0
    dof = max(len(r) - 9, 1)
    try:
        cov = np.linalg.inv(J.T @ J) * max(cost / dof, 1.0)
    except np.linalg.LinAlgError:
        cov = None
    return th, cost, cov


def estimate_pitch(cam: Camera, track, times, method='auto', x_plane=0.0):
    """Return estimate dict; failures return {'ok': False, 'measured': False, 'value_origin': 'monocular-estimate', 'reason': ...} and stay in the denominator."""
    if len(track) < 5:
        return {'ok': False, 'measured': False, 'value_origin': 'monocular-estimate', 'reason': 'TRACK_TOO_SHORT', 'n_detections': len(track)}
    uv_mid = [track[len(track) // 2][1]['u'], track[len(track) // 2][1]['v']]
    base = choose_method(cam, uv_mid) if method in ('auto', 'model', 'best') else method
    if method == 'best':
        # Benchmark finding: the flight-model fit helps side-type views but is ill-posed along the camera axis.
        method = 'model' if base == 'plane' else 'auto'
    t = np.array([times[i] for i, _ in track])
    P = points_3d(cam, track, base, x_plane)
    if not np.all(np.isfinite(P)):
        return {'ok': False, 'measured': False, 'value_origin': 'monocular-estimate', 'reason': 'DEGENERATE_GEOMETRY', 'method': base, 'n_detections': len(track)}
    coef, keep, res = fit_constant_acceleration(t, P)
    fallback = None
    if method == 'model':
        fit = refine_model(cam, track, times, coef)
        if fit is None:
            return {'ok': False, 'measured': False, 'value_origin': 'monocular-estimate', 'reason': 'MODEL_FIT_FAILED', 'method': 'model', 'n_detections': len(track)}
        th, _, cov = fit
        t0 = t[0]
        # Re-express around absolute time: p(t) = p0' + v0'·t + ½a·t²
        a = th[6:]; v0 = th[3:6] - a * t0; p0 = th[:3] - v0 * t0 - 0.5 * a * t0 ** 2
        model_coef = np.vstack([p0, v0, a])
        bad = implausible(model_coef, t[0])
        if bad:
            # Keep the geometric estimate and say why the model fit was not used.
            fallback, method = {'reason': 'MODEL_REJECTED_IMPLAUSIBLE', 'failed_checks': bad}, base
        else:
            coef = model_coef; keep = np.ones(len(t), bool)
            res = np.linalg.norm(np.column_stack([np.ones_like(t), t, 0.5 * t ** 2]) @ coef - P, axis=1)
    method = base if method == 'auto' else method
    v_first = coef[1] + coef[2] * t[0]
    tc = plate_crossing(coef, t[0])
    sigma = None
    if method == 'model' and cov is not None and tc is not None:
        # Monte Carlo propagation of the parameter covariance to speed and plate position.
        rng = np.random.default_rng(0)
        draws = rng.multivariate_normal(th, cov, 300, check_valid='ignore')
        sp, px, pz = [], [], []
        for d in draws:
            a_ = d[6:]; v_ = d[3:6] - a_ * t[0]; p_ = d[:3] - v_ * t[0] - 0.5 * a_ * t[0] ** 2
            c_ = np.vstack([p_, v_, a_]); tt = plate_crossing(c_, t[0])
            sp.append(np.linalg.norm(v_ + a_ * t[0]) * 3.6)
            if tt is not None:
                q = p_ + v_ * tt + 0.5 * a_ * tt ** 2; px.append(q[0]); pz.append(q[2])
        sigma = {'speed_kmh': float(np.std(sp)), 'plate_x_cm': float(np.std(px) * 100) if px else None, 'plate_z_cm': float(np.std(pz) * 100) if pz else None}
    plate = None
    if tc is not None:
        pc = coef[0] + coef[1] * tc + 0.5 * coef[2] * tc ** 2
        # Under the plane constraint x is assumed, not observed: report it as unknown instead of the assumption.
        x_ok = method != 'plane' and not (sigma and (sigma['plate_x_cm'] is None or sigma['plate_x_cm'] > X_SIGMA_LIMIT_CM))
        plate = {'t_s': tc, 'x_m': float(pc[0]) if x_ok else None, 'z_m': float(pc[2]),
                 'x_observable': bool(x_ok), 'extrapolated_s': float(max(0.0, tc - t[keep].max()))}
    return {'ok': True, 'method': method, 'n_detections': len(track), 'n_inliers': int(keep.sum()),
            't_first_s': float(t[0]), 't_last_s': float(t[-1]), 'speed_at_first_kmh': float(np.linalg.norm(v_first) * 3.6),
            'velocity_first_mps': v_first.tolist(), 'acceleration_mps2': coef[2].tolist(), 'plate': plate,
            'fit_rms_m': float(np.sqrt(np.mean(res[keep] ** 2))), 'sigma': sigma, 'model_fallback': fallback, 'value_origin': 'monocular-estimate', 'measured': False}
