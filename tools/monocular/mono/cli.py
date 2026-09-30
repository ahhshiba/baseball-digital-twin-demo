"""python -m mono.cli {synth,analyze,benchmark} — see tools/monocular/README.md."""
from __future__ import annotations
import argparse
import json
import time
from pathlib import Path
import numpy as np
from .camera import Camera, load_calibration
from .synth import VIEWS, view_camera, render_clip, write_video, load_pitches, Trajectory
from .tracking import detect_all, track_ball
from .estimate import estimate_pitch
from .candidates import build_candidates, write_review_csv, write_contact_sheet, save_json
from .compare import compare_clip, aggregate, TARGETS

REPO = Path(__file__).resolve().parents[3]
DEFAULT_PITCHES = REPO / 'data' / 'synthetic_pitches.json'


def analyze_frames(frames, times, cam: Camera, clip_id, method='best', fps=None):
    detections = detect_all(frames)
    track = track_ball(detections, times)
    est = estimate_pitch(cam, track, times, method=method)
    return detections, track, est, build_candidates(clip_id, times, detections, track, est, fps)


def read_video(path):
    import cv2
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise SystemExit(f'cannot open {path}')
    frames, times = [], []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) if f.ndim == 3 else f)
        times.append(cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0)  # container timestamps; phones may be variable-rate
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()
    times = np.array(times)
    if len(times) > 1 and not np.all(np.diff(times) > 0):
        times = np.arange(len(frames)) / fps  # fall back to nominal rate when timestamps are unusable
    return np.stack(frames), times, fps


def cmd_synth(a):
    rec = next(r for r in json.loads(Path(a.pitches).read_text(encoding='utf-8'))['records'] if r['id'] == a.pitch)
    cam = view_camera(a.view, a.width, a.height)
    frames, times, truth, _ = render_clip(rec, cam, fps=a.fps, exposure_s=a.exposure, seed=a.seed,
                                          occlude_after=0.8 if rec['id'].endswith('occluded') else None)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    write_video(out / 'clip.mp4', frames, a.fps)
    save_json(out / 'camera.json', cam.to_dict())
    save_json(out / 'truth.json', {**truth, 'frame_times_s': times.tolist()})
    print(f'{out}/clip.mp4  frames={len(frames)}  camera={a.view}  (synthetic)')


def cmd_analyze(a):
    cam = load_calibration(a.camera)
    frames, times, fps = read_video(a.video)
    if a.times:
        times = np.array(json.loads(Path(a.times).read_text(encoding='utf-8'))['frame_times_s'])[:len(frames)]
    clip_id = a.clip_id or Path(a.video).stem
    _, track, est, cand = analyze_frames(frames, times, cam, clip_id, a.method, fps)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    save_json(out / 'candidates.json', cand)
    write_review_csv(out / 'review.csv', cand)
    sheet = write_contact_sheet(out / 'contact_sheet.png', frames, track)
    print(json.dumps({'clip': clip_id, 'frames': len(frames), 'fps': fps, 'track_len': len(track), 'estimate_ok': est.get('ok'),
                      'method': est.get('method'), 'speed_at_first_kmh': est.get('speed_at_first_kmh'), 'events': len(cand['events']),
                      'contact_sheet': sheet, 'out': str(out)}, ensure_ascii=False))


def run_benchmark(pitches, views, fps_list, exposure_s, width, height, seed=1, methods=('auto', 'model', 'best')):
    rows, configs = [], []
    for view in views:
        cam = view_camera(view, width, height)
        for fps in fps_list:
            per_method = {m: [] for m in methods}
            for k, rec in enumerate(pitches):
                occl = 0.8 if rec['id'].endswith('occluded') else None
                frames, times, truth, traj = render_clip(rec, cam, fps=fps, exposure_s=exposure_s, seed=seed + k, occlude_after=occl)
                track = track_ball(detect_all(frames), times)
                for m in methods:
                    row = compare_clip(estimate_pitch(cam, track, times, method=m), truth, traj.velocity)
                    row.update({'view': view, 'fps': fps, 'requested_method': m, 'pitch_id': rec['id'], 'occluded': occl is not None})
                    per_method[m].append(row)
            for m, cfg_rows in per_method.items():
                rows += cfg_rows
                configs.append({'view': view, 'fps': fps, 'requested_method': m, 'exposure_s': exposure_s, **aggregate(cfg_rows)})
    return rows, configs


def report_markdown(configs, meta):
    L = ['# 單鏡輔助層 vs 參考值（合成）', '',
         f"- 參考：{meta['reference']}；片段：{meta['clips_per_config']} 球／組；解析度 {meta['resolution']}；曝光 {meta['exposure_s']*1000:.2f} ms",
         '- **counts_toward_acceptance = false**：此表不計入 full-field-v1 驗收，也不是實測。', '',
         '- 方法：geometry = 平面或球徑單一約束；model = 直接對2D軌跡擬合飛行模型（含透視、球徑、重力先驗）並給不確定度，不合物理者退回 geometry；best = 側向視角用 model、沿軸視角用球徑（`analyze` 預設）。',
         '- 進壘 x 只在可觀測時回報（平面法恆不可觀測；model 法 σ>5cm 也不回報），「x回報」欄為有回報的球數。',
         '- 2σ涵蓋率：誤差落在自報 2σ 內的比例，用來檢查不確定度是否誠實（理想約 95%）。', '',
         '| 視角 | fps | 方法 | 成功 | 球速偏差 km/h | 球速|誤差| P95 | 進壘高度 P95 cm | 進壘 x P95 cm（x回報） | 2σ涵蓋 球速／高度 |',
         '|---|---|---|---|---|---|---|---|---|']
    f = lambda v, d=1: '—' if v is None else f'{v:.{d}f}'
    pct = lambda v: '—' if v is None else f'{v*100:.0f}%'
    for c in configs:
        name = {'model': 'model', 'best': 'best→' + '/'.join(c['methods'])}.get(c['requested_method'], 'geometry(' + '/'.join(c['methods']) + ')')
        L.append(f"| {c['view']} | {c['fps']:g} | {name} | {c['estimated']}/{c['clips']} | {f(c['speed_bias_kmh'])} | {f(c['speed_abs_p95_kmh'])} | {f(c['plate_z_abs_p95_cm'])} | {f(c['plate_x_abs_p95_cm'])}（{c['plate_x_reported']}） | {pct(c['speed_2sigma_coverage'])}／{pct(c['plate_z_2sigma_coverage'])} |")
    L += ['', f"一期多相機目標（對照用，非本表門檻）：球速 P95 ≤ {TARGETS['speed_abs_p95_kmh']} km/h、指定區域位置 P95 ≤ 20 mm。",
          '單鏡無法提供：直接轉速、三維有向轉軸、800ms 本地交付證明。']
    return '\n'.join(L) + '\n'


def cmd_benchmark(a):
    pitches = load_pitches(a.pitches)
    if a.limit:
        pitches = pitches[:a.limit]
    t0 = time.time()
    rows, configs = run_benchmark(pitches, a.views.split(','), [float(x) for x in a.fps.split(',')], a.exposure, a.width, a.height)
    meta = {'schema_version': 'benchmark-evidence/1.0-monocular', 'source': 'synthetic', 'reference': 'synthetic ground truth (data/synthetic_pitches.json)',
            'counts_toward_acceptance': False, 'clips_per_config': len(pitches), 'resolution': f'{a.width}x{a.height}', 'exposure_s': a.exposure,
            'runtime_s': round(time.time() - t0, 1), 'not_modelled': ['rolling shutter', 'compression', 'lens distortion', 'lighting change', 'background motion', 'calibration error']}
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    save_json(out / 'monocular_benchmark.json', {**meta, 'configs': configs, 'rows': rows})
    (out / 'monocular_benchmark.md').write_text(report_markdown(configs, meta), encoding='utf-8')
    print((out / 'monocular_benchmark.md').read_text(encoding='utf-8'))


def main(argv=None):
    p = argparse.ArgumentParser(prog='mono')
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('synth', help='render a synthetic single-camera clip of one pitch')
    s.add_argument('--pitch', default='syn-build-FF-strike'); s.add_argument('--view', choices=sorted(VIEWS), default='side')
    s.add_argument('--fps', type=float, default=240); s.add_argument('--exposure', type=float, default=1 / 1000)
    s.add_argument('--width', type=int, default=1280); s.add_argument('--height', type=int, default=720)
    s.add_argument('--seed', type=int, default=0); s.add_argument('--pitches', default=str(DEFAULT_PITCHES)); s.add_argument('--out', required=True)
    s.set_defaults(fn=cmd_synth)
    z = sub.add_parser('analyze', help='video + calibration -> event candidates for review')
    z.add_argument('--video', required=True); z.add_argument('--camera', required=True, help='camera.json (K,R,t) or calibration points json')
    z.add_argument('--times', help='optional json with frame_times_s (e.g. truth.json from synth)')
    z.add_argument('--method', choices=['best', 'model', 'auto', 'plane', 'size'], default='best'); z.add_argument('--clip-id'); z.add_argument('--out', required=True)
    z.set_defaults(fn=cmd_analyze)
    b = sub.add_parser('benchmark', help='single-camera estimate vs reference over views × fps')
    b.add_argument('--views', default='side,behind,high'); b.add_argument('--fps', default='60,120,240')
    b.add_argument('--exposure', type=float, default=1 / 1000); b.add_argument('--width', type=int, default=1280); b.add_argument('--height', type=int, default=720)
    b.add_argument('--limit', type=int, default=0); b.add_argument('--pitches', default=str(DEFAULT_PITCHES)); b.add_argument('--out', required=True)
    b.set_defaults(fn=cmd_benchmark)
    a = p.parse_args(argv)
    a.fn(a)


if __name__ == '__main__':
    main()
