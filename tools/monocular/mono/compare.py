"""Single-camera estimate vs reference, per clip and aggregated per configuration.

Reference today = synthetic ground truth. The same function accepts a real multi-camera / reference-instrument
result later (same keys). Results are evidence for engineering decisions only: counts_toward_acceptance = false.
"""
from __future__ import annotations
import numpy as np


def compare_clip(estimate, reference, ref_velocity_at=None):
    """reference: {'release_speed_kmh','plate_x_m','plate_height_m'}; ref_velocity_at(t)->m/s vector for a like-for-like speed check."""
    row = {'ok': bool(estimate.get('ok')), 'reason': estimate.get('reason'), 'method': estimate.get('method'),
           'n_detections': estimate.get('n_detections', 0), 'model_fallback': bool(estimate.get('model_fallback'))}
    if not row['ok']:
        return row
    if ref_velocity_at is not None:
        ref_speed = float(np.linalg.norm(ref_velocity_at(estimate['t_first_s'])) * 3.6)
    else:
        ref_speed = float(reference['release_speed_kmh'])
    row['speed_err_kmh'] = estimate['speed_at_first_kmh'] - ref_speed
    pl = estimate.get('plate')
    if pl:
        if pl['x_m'] is not None:
            row['plate_x_err_cm'] = (pl['x_m'] - reference['plate_x_m']) * 100
        row['plate_z_err_cm'] = (pl['z_m'] - reference['plate_height_m']) * 100
        row['extrapolated_s'] = pl['extrapolated_s']
    sg = estimate.get('sigma')
    if sg:  # is the reported uncertainty honest? fraction of errors inside 2σ is aggregated below
        row['speed_within_2sigma'] = abs(row['speed_err_kmh']) <= 2 * sg['speed_kmh']
        if 'plate_z_err_cm' in row and sg['plate_z_cm']:
            row['plate_z_within_2sigma'] = abs(row['plate_z_err_cm']) <= 2 * sg['plate_z_cm']
    return row


def _p95(x):
    return float(np.percentile(np.abs(x), 95)) if len(x) else None


def aggregate(rows):
    ok = [r for r in rows if r['ok']]
    fails = {}
    for r in rows:
        if not r['ok']:
            fails[r['reason']] = fails.get(r['reason'], 0) + 1
    speed = [r['speed_err_kmh'] for r in ok]
    px = [r['plate_x_err_cm'] for r in ok if 'plate_x_err_cm' in r]
    pz = [r['plate_z_err_cm'] for r in ok if 'plate_z_err_cm' in r]
    return {'clips': len(rows), 'estimated': len(ok), 'failures': fails,
            'speed_bias_kmh': float(np.mean(speed)) if speed else None, 'speed_abs_p95_kmh': _p95(speed),
            'plate_x_abs_p95_cm': _p95(px), 'plate_z_abs_p95_cm': _p95(pz),
            'plate_x_reported': len(px), 'model_fallbacks': sum(r.get('model_fallback', False) for r in rows), 'methods': sorted({r['method'] for r in ok}),
            'speed_2sigma_coverage': _frac([r['speed_within_2sigma'] for r in ok if 'speed_within_2sigma' in r]),
            'plate_z_2sigma_coverage': _frac([r['plate_z_within_2sigma'] for r in ok if 'plate_z_within_2sigma' in r])}


def _frac(flags):
    return float(np.mean(flags)) if flags else None


# v4.2 phase-one training targets, for context only (report p.108). Single-camera numbers are not scored against them.
TARGETS = {'speed_abs_p95_kmh': 1.0, 'plate_position_p95_cm': 2.0}
