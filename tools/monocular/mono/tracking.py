"""Ball candidates by background subtraction, and a gated constant-velocity tracker.

Classical baseline on purpose: explainable, CPU-only, no licence questions. An optional YOLO adapter
(detect_people_yolo) can add player boxes for labelling; Ultralytics is AGPL — review licensing before
commercial use.
"""
from __future__ import annotations
import numpy as np


def median_background(frames, max_samples=60):
    idx = np.linspace(0, len(frames) - 1, min(len(frames), max_samples)).astype(int)
    return np.median(frames[idx], axis=0).astype(np.float32)


def detect_ball(frame, background, diff_thresh=22.0, min_area=1, max_area=2500):
    """Return candidates [{u,v,area,radius_px,peak}] for bright/dark compact blobs that differ from background."""
    import cv2
    diff = np.abs(frame.astype(np.float32) - background)
    mask = (diff > diff_thresh).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = []
    for k in range(1, n):
        area = int(stats[k, cv2.CC_STAT_AREA])
        if not (min_area <= area <= max_area):
            continue
        ys, xs = np.nonzero(labels == k)
        w = diff[ys, xs]
        u, v = float(np.average(xs, weights=w)), float(np.average(ys, weights=w))
        # Motion blur stretches the ball along its path; the minor axis still carries its size.
        if area >= 5:
            cov = np.cov(np.vstack([xs, ys]), aweights=w)
            lam_min = float(max(np.linalg.eigvalsh(cov)[0], 0.0))
            radius = 2 * np.sqrt(lam_min) if lam_min > 0 else np.sqrt(area / np.pi)
        else:
            radius = float(np.sqrt(area / np.pi))
        out.append({'u': u, 'v': v, 'area': area, 'radius_px': float(radius), 'peak': float(w.max())})
    return out


def detect_all(frames, **kw):
    bg = median_background(frames)
    return [detect_ball(f, bg, **kw) for f in frames]


def track_ball(detections, times, max_gap=3, min_len=4, gate_px=12.0, gate_speed_frac=0.35):
    """Greedy constant-velocity linking; returns the longest plausible track as a list of (frame_index, candidate)."""
    best = []
    for i0, cands in enumerate(detections):
        for c0 in cands:
            track, last_i, vel = [(i0, c0)], i0, None
            i = i0 + 1
            while i < len(detections) and i - last_i <= max_gap + 1:
                li, lc = track[-1]
                dt = times[i] - times[li]
                pred = np.array([lc['u'], lc['v']]) + (vel * dt if vel is not None else 0)
                speed = np.linalg.norm(vel) * dt if vel is not None else 0
                gate = gate_px + gate_speed_frac * speed if vel is not None else 90.0
                options = [(np.hypot(c['u'] - pred[0], c['v'] - pred[1]), c) for c in detections[i]]
                options = [o for o in options if o[0] <= gate]
                if options:
                    _, c = min(options, key=lambda o: o[0])
                    new_vel = np.array([c['u'] - lc['u'], c['v'] - lc['v']]) / dt
                    vel = new_vel if vel is None else 0.5 * vel + 0.5 * new_vel
                    track.append((i, c))
                    last_i = i
                i += 1
            if len(track) > len(best):
                best = track
    return best if len(best) >= min_len else []


def detect_people_yolo(frames, model_name='yolo11n.pt', conf=0.3):
    """Optional: person boxes per frame for the labelling queue. Requires `pip install ultralytics` (AGPL).

    Not exercised by the test suite and not validated on baseball footage.
    """
    from ultralytics import YOLO  # noqa: deferred optional dependency
    model = YOLO(model_name)
    out = []
    for f in frames:
        res = model.predict(f if f.ndim == 3 else np.dstack([f] * 3), conf=conf, classes=[0], verbose=False)[0]
        out.append([{'box_xyxy': b.tolist(), 'conf': float(c)} for b, c in zip(res.boxes.xyxy.cpu().numpy(), res.boxes.conf.cpu().numpy())])
    return out
