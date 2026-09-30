"""Labelling accelerator: turn one clip into event candidates for human review (never final labels)."""
from __future__ import annotations
import csv
import json
import numpy as np

SOURCE = 'monocular-candidate'


def _ns(t):
    return str(int(round(t * 1e9)))


def build_candidates(clip_id, times, detections, track, estimate, fps=None):
    """bb-event/1.0-proposal shaped candidates; status is always needs_review, revision 0."""
    events = []
    def add(kind, t, conf, frame=None, reasons=(), extra=None):
        events.append({'event_id': f'{clip_id}-c{len(events) + 1}', 'play_id': clip_id, 'type': kind, 't_event_ns': _ns(t), 't_s': round(float(t), 6),
                       'frame_index': frame, 'actor_ids': [], 'ball_track_id': f'{clip_id}-ball', 'status': 'needs_review',
                       'confidence': round(float(conf), 3), 'reason_codes': list(reasons), 'source': SOURCE, 'revision': 0, **(extra or {})})
    if not track:
        add('no_ball_track', float(times[0]) if len(times) else 0.0, 0.0, 0, ['NO_TRACK'])
    else:
        (i0, c0), (i1, _) = track[0], track[-1]
        add('release_candidate', times[i0], min(1.0, len(track) / 12), i0, ['FIRST_TRACKED_FRAME'], {'px': [c0['u'], c0['v']]})
        frames = [i for i, _ in track]
        for a, b in zip(frames, frames[1:]):
            if b - a > 1:
                add('tracking_gap', times[a], 0.5, a, [f'MISSING_{b - a - 1}_FRAMES'], {'gap_until_s': round(float(times[b]), 6)})
        if estimate.get('ok') and estimate.get('plate'):
            pl = estimate['plate']
            reasons = ['EXTRAPOLATED'] if pl['extrapolated_s'] > 0.03 else []
            add('plate_crossing_candidate', pl['t_s'], 0.4 if reasons else 0.7, None, reasons,
                {'plate_estimate_m': {'x': None if pl['x_m'] is None else round(pl['x_m'], 4), 'z': round(pl['z_m'], 4)}, 'method': estimate['method']})
            if pl['extrapolated_s'] > 0.06:
                add('occlusion_suspected', times[i1], 0.5, i1, ['TRACK_ENDS_BEFORE_PLATE'])
    return {'schema_version': 'monocular-candidates/0.1', 'clip_id': clip_id, 'source': SOURCE, 'fps': fps,
            'counts_toward_acceptance': False, 'label_status': 'needs_review',
            'note': '單鏡自動候選，只供人工覆核加速；不是最終標註、不是量測結果。',
            'estimate': estimate, 'events': events,
            'frames': [{'frame_index': i, 't_s': round(float(t), 6), 'ball_candidates': [{k: round(v, 3) if isinstance(v, float) else v for k, v in c.items()} for c in d],
                        'on_track': any(j == i for j, _ in track)} for i, (t, d) in enumerate(zip(times, detections))]}


def write_review_csv(path, cand):
    with open(path, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh)
        w.writerow(['event_id', 'type', 't_s', 'frame_index', 'confidence', 'reason_codes', 'status', 'reviewer_decision', 'corrected_t_s', 'notes'])
        for e in cand['events']:
            w.writerow([e['event_id'], e['type'], e['t_s'], e['frame_index'], e['confidence'], ';'.join(e['reason_codes']), e['status'], '', '', ''])


def write_contact_sheet(path, frames, track, cols=6, max_tiles=24, crop=160):
    """Frames around the track, ball circled, so a reviewer can confirm in seconds."""
    import cv2
    if not track:
        return False
    idx = [i for i, _ in track]
    sel = sorted(set(np.linspace(max(idx[0] - 2, 0), min(idx[-1] + 2, len(frames) - 1), min(max_tiles, idx[-1] - idx[0] + 5)).astype(int)))
    pos = {i: (c['u'], c['v']) for i, c in track}
    tiles = []
    for i in sel:
        img = cv2.cvtColor(frames[i], cv2.COLOR_GRAY2BGR) if frames[i].ndim == 2 else frames[i].copy()
        near = min(pos, key=lambda j: abs(j - i))
        cu, cv_ = map(int, pos[near])
        if i in pos:
            cv2.circle(img, (cu, cv_), 9, (0, 200, 255), 1, cv2.LINE_AA)
        h, w = img.shape[:2]
        x0, y0 = int(np.clip(cu - crop // 2, 0, w - crop)), int(np.clip(cv_ - crop // 2, 0, h - crop))
        tile = cv2.resize(img[y0:y0 + crop, x0:x0 + crop], (crop, crop))
        cv2.putText(tile, f'#{i}{"" if i in pos else " -"}', (4, 14), cv2.FONT_HERSHEY_SIMPLEX, .4, (255, 255, 255), 1, cv2.LINE_AA)
        tiles.append(tile)
    while len(tiles) % cols:
        tiles.append(np.zeros_like(tiles[0]))
    sheet = np.vstack([np.hstack(tiles[r:r + cols]) for r in range(0, len(tiles), cols)])
    return bool(cv2.imwrite(str(path), sheet))


def save_json(path, obj):
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1)
