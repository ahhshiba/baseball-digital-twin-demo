"""Render synthetic single-camera clips of a known pitch, so the monocular pipeline can be scored against truth.

Synthetic stand-in for phone / single-camera footage: grass/dirt background, plate and rubber, a ball with
exposure motion blur, sensor noise, random frame phase and optional occlusion. It is not photorealistic and
does not model rolling shutter, compression, lens distortion or lighting changes.
"""
from __future__ import annotations
import json
import numpy as np
from .camera import Camera, BALL_RADIUS_M

VIEWS = {
    # name: (position, target, hfov) in world metres
    'side': ((-14.0, 9.2, 1.5), (0.0, 9.2, 1.3), 70.0),        # third-base side, perpendicular to the pitch
    'behind': ((0.0, -5.0, 2.2), (0.0, 18.4, 1.4), 40.0),      # behind the backstop, along the pitch
    'high': ((-12.0, -10.0, 10.0), (0.0, 9.0, 1.0), 45.0),     # F01-like elevated station
}


def view_camera(name, width=1280, height=720):
    pos, tgt, fov = VIEWS[name]
    return Camera.look_at(pos, tgt, width, height, fov, name=name)


class Trajectory:
    """World trajectory from a synthetic pitch record; linear extrapolation after the plate."""
    def __init__(self, record):
        s = record['world_trajectory']['samples']
        self.t = np.array([x['t_s'] for x in s])
        self.p = np.array([x['position_m'] for x in s])
        self.v = np.array([x['velocity_mps'] for x in s])
        self.duration = float(self.t[-1])

    def position(self, t):
        t = np.atleast_1d(t).astype(float)
        out = np.column_stack([np.interp(t, self.t, self.p[:, k]) for k in range(3)])
        late = t > self.duration
        out[late] = self.p[-1] + np.outer(t[late] - self.duration, self.v[-1])
        return out

    def velocity(self, t):
        t = np.atleast_1d(t).astype(float)
        return np.column_stack([np.interp(t, self.t, self.v[:, k]) for k in range(3)])


def _background(cam: Camera, rng):
    h, w = cam.height, cam.width
    img = np.full((h, w), 92.0) + rng.normal(0, 6, (h, w))
    # Horizon / sky above the projected horizon line: brighter band.
    far = np.array([[x, 400.0, 0.0] for x in np.linspace(-400, 400, 9)])
    uv, z = cam.project(far)
    ok = np.isfinite(uv[:, 1]) & (z > 0)
    if ok.any():
        hz = int(np.clip(np.nanmedian(uv[ok, 1]), 0, h))
        img[:hz] = 150 + rng.normal(0, 4, (hz, w))
    import cv2
    def poly(points, value):
        uv, z = cam.project(np.array(points, float))
        if np.all(z > 0.5):
            cv2.fillPoly(img, [np.round(uv).astype(np.int32)], float(value))
    ring = lambda cx, cy, r, n=48: [(cx + r * np.cos(a), cy + r * np.sin(a), 0.0) for a in np.linspace(0, 2 * np.pi, n, endpoint=False)]
    poly(ring(0, 18.44, 2.74), 128)          # mound dirt
    poly(ring(0, 0.2, 2.9), 128)             # home dirt circle
    poly([(-.2159, 0, .01), (.2159, 0, .01), (.2159, .2159, .01), (.2159, .4318, .01), (-.2159, .4318, .01), (-.2159, .2159, .01)], 235)
    poly([(-.3048, 18.44, .26), (.3048, 18.44, .26), (.3048, 18.59, .26), (-.3048, 18.59, .26)], 235)
    return img


def render_clip(record, cam: Camera, fps=240.0, exposure_s=1 / 1000, noise=3.0, seed=0, pre_s=0.05, post_s=0.05,
                drop_every=0, occlude_after=None):
    """Return frames (N,H,W) uint8, timestamps (N,), truth dict. occlude_after: fraction of flight hidden (e.g. 0.8)."""
    rng = np.random.default_rng(seed)
    traj = Trajectory(record)
    bg = _background(cam, rng)
    phase = rng.uniform(0, 1 / fps)
    times = np.arange(-pre_s + phase, traj.duration + post_s, 1 / fps)
    occluder = None
    if occlude_after is not None:
        # A body-sized dark box around the ball path over the last part of the flight (e.g. batter / catcher).
        pts = traj.position(np.linspace(traj.duration * occlude_after, traj.duration, 12))
        uv, _ = cam.project(pts)
        uv = uv[np.isfinite(uv).all(axis=1)]
        if len(uv):
            pad = max(12.0, float(cam.pixel_radius(pts).max()) * 4)
            occluder = (uv.min(0) - pad, uv.max(0) + pad)
    frames, stamps, dropped = [], [], []
    yy, xx = np.mgrid[0:cam.height, 0:cam.width]
    for i, t in enumerate(times):
        if drop_every and i % drop_every == drop_every - 1:
            dropped.append(float(t))
            continue
        img = bg.copy()
        if 0 <= t <= traj.duration + post_s:
            sub = np.linspace(t - exposure_s / 2, t + exposure_s / 2, 9)
            P = traj.position(np.clip(sub, 0, None))
            uv, z = cam.project(P)
            r = np.maximum(cam.K[0, 0] * BALL_RADIUS_M / z, 0.6)
            acc = np.zeros_like(img)
            for (u, v), rr, zz in zip(uv, r, z):
                if not np.isfinite(u) or zz <= 0:
                    continue
                x0, x1 = int(max(u - rr - 2, 0)), int(min(u + rr + 3, cam.width))
                y0, y1 = int(max(v - rr - 2, 0)), int(min(v + rr + 3, cam.height))
                if x0 >= x1 or y0 >= y1:
                    continue
                d = np.hypot(xx[y0:y1, x0:x1] - u, yy[y0:y1, x0:x1] - v)
                acc[y0:y1, x0:x1] += np.clip(rr + .5 - d, 0, 1)
            acc /= len(sub)
            img = img * (1 - acc) + 235 * acc
        if occluder is not None:
            (u0, v0), (u1, v1) = occluder
            img[int(max(v0, 0)):int(min(v1, cam.height)), int(max(u0, 0)):int(min(u1, cam.width))] = 40
        img += rng.normal(0, noise, img.shape)
        frames.append(np.clip(img, 0, 255).astype(np.uint8))
        stamps.append(float(t))
    truth = {'pitch_id': record['id'], 'pitch_type': record['pitch_type']['label'], 'scenario': record['abs'].get('call'),
             'release_speed_kmh': record['metrics']['release_speed_kmh'], 'plate_x_m': record['metrics']['plate_x_m'],
             'plate_height_m': record['metrics']['plate_height_m'], 'flight_time_s': traj.duration,
             'fps': fps, 'exposure_s': exposure_s, 'dropped_frame_times': dropped, 'camera': cam.to_dict(),
             'source': 'synthetic', 'occluded_after_fraction': occlude_after}
    return np.stack(frames), np.array(stamps), truth, traj


def write_video(path, frames, fps):
    import cv2
    h, w = frames.shape[1:]
    out = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'mp4v'), float(fps), (w, h), isColor=False)
    if not out.isOpened():
        raise RuntimeError(f'cannot open video writer for {path}')
    for f in frames:
        out.write(f)
    out.release()


def load_pitches(path):
    with open(path, encoding='utf-8') as fh:
        d = json.load(fh)
    seen, unique = set(), []
    for r in d['records']:
        key = (r['pitch_type']['label'], r['id'].split('-')[-1])
        if key not in seen:  # A/B copies share the same trajectory
            seen.add(key)
            unique.append(r)
    return unique
