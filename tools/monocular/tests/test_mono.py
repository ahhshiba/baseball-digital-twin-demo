import json
import sys
import tempfile
import unittest
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from mono.camera import Camera, calibrate, FIELD_POINTS  # noqa: E402
from mono.synth import view_camera, render_clip, load_pitches, write_video  # noqa: E402
from mono.tracking import detect_all, track_ball  # noqa: E402
from mono.estimate import estimate_pitch  # noqa: E402
from mono.candidates import build_candidates  # noqa: E402
from mono.compare import compare_clip, aggregate  # noqa: E402
from mono import cli  # noqa: E402

PITCHES = HERE.parents[1] / 'data' / 'synthetic_pitches.json'


def pitch(pid):
    return next(r for r in json.loads(PITCHES.read_text(encoding='utf-8'))['records'] if r['id'] == pid)


@unittest.skipUnless(PITCHES.exists(), 'run `npm run export-data` first')
class MonocularTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cam = view_camera('side', 640, 360)
        cls.frames, cls.times, cls.truth, cls.traj = render_clip(pitch('syn-build-FF-strike'), cls.cam, fps=120, seed=2)
        cls.track = track_ball(detect_all(cls.frames), cls.times)

    def test_camera_projection_round_trip(self):
        cam = Camera.look_at((-10, 5, 2), (0, 10, 1), 1280, 720, 60)
        uv, z = cam.project(np.array([[0, 10, 1.0]]))
        np.testing.assert_allclose(uv[0], [640, 360], atol=1e-6)
        X = np.array([[1.0, 12.0, 1.5]])
        uv, z = cam.project(X)
        rebuilt = cam.center + cam.ray(uv)[0] * np.linalg.norm(X[0] - cam.center)
        np.testing.assert_allclose(rebuilt, X[0], atol=1e-6)

    def test_calibration_from_field_points_recovers_camera(self):
        true = Camera.look_at((-14, 9.2, 1.5), (0, 9.2, 1.3), 1280, 720, 70)
        names = ['plate_rear_tip', 'plate_left_front', 'plate_right_front', 'rubber_left', 'rubber_right', 'first_base', 'third_base']
        uv, _ = true.project(np.array([FIELD_POINTS[n] for n in names]))
        rng = np.random.default_rng(0)
        cam = calibrate({'width': 1280, 'height': 720, 'hfov_deg': 70,
                         'points': [{'name': n, 'px': (p + rng.normal(0, .3, 2)).tolist()} for n, p in zip(names, uv) if np.all(np.isfinite(p))]})
        self.assertLess(cam.meta['reprojection_rmse_px'], 1.0)
        self.assertLess(np.linalg.norm(cam.center - true.center), 0.5)

    def test_detection_tracks_most_of_the_flight_with_subpixel_error(self):
        in_flight = np.sum((self.times >= 0) & (self.times <= self.truth['flight_time_s']))
        self.assertGreater(len(self.track), 0.8 * in_flight)
        uv_true, _ = self.cam.project(self.traj.position(np.array([self.times[i] for i, _ in self.track])))
        err = np.linalg.norm(np.array([[c['u'], c['v']] for _, c in self.track]) - uv_true, axis=1)
        self.assertLess(np.median(err), 0.5)

    def test_model_fit_beats_plane_and_plane_never_reports_lateral_position(self):
        # 1280x720 = benchmark resolution; at 640x360 the ball is ~1 px and the model loses its size cue (see README).
        cam = view_camera('side', 1280, 720)
        fr, t, truth, traj = render_clip(pitch('syn-build-FF-strike'), cam, fps=120, seed=2)
        track = track_ball(detect_all(fr), t)
        plane = compare_clip(estimate_pitch(cam, track, t, 'auto'), truth, traj.velocity)
        model = compare_clip(estimate_pitch(cam, track, t, 'model'), truth, traj.velocity)
        self.assertEqual(plane['method'], 'plane')
        self.assertNotIn('plate_x_err_cm', plane)
        self.assertLess(abs(model['speed_err_kmh']), abs(plane['speed_err_kmh']))
        self.assertLess(abs(model['speed_err_kmh']), 5.0)
        self.assertLess(abs(model['plate_z_err_cm']), 3.0)

    def test_estimates_are_marked_as_estimates(self):
        est = estimate_pitch(self.cam, self.track, self.times, 'model')
        self.assertFalse(est['measured'])
        self.assertEqual(est['value_origin'], 'monocular-estimate')
        self.assertIsNotNone(est['sigma'])

    def test_occlusion_yields_review_candidates_not_labels(self):
        fr, t, truth, traj = render_clip(pitch('syn-build-FF-occluded'), self.cam, fps=120, seed=4, occlude_after=0.7)
        track = track_ball(detect_all(fr), t)
        est = estimate_pitch(self.cam, track, t, 'model')
        cand = build_candidates('occl', t, detect_all(fr), track, est, 120)
        types = [e['type'] for e in cand['events']]
        self.assertIn('occlusion_suspected', types)
        self.assertTrue(all(e['status'] == 'needs_review' and e['revision'] == 0 for e in cand['events']))
        self.assertFalse(cand['counts_toward_acceptance'])
        plate = next(e for e in cand['events'] if e['type'] == 'plate_crossing_candidate')
        self.assertIn('EXTRAPOLATED', plate['reason_codes'])

    def test_empty_clip_keeps_failure_in_denominator(self):
        empty = np.repeat(self.frames[:1], 30, axis=0)
        track = track_ball(detect_all(empty), self.times[:30])
        est = estimate_pitch(self.cam, track, self.times[:30])
        self.assertFalse(est['ok'])
        cand = build_candidates('empty', self.times[:30], [[]] * 30, track, est)
        self.assertEqual(cand['events'][0]['type'], 'no_ball_track')
        agg = aggregate([compare_clip(est, self.truth), compare_clip(estimate_pitch(self.cam, self.track, self.times, 'model'), self.truth, self.traj.velocity)])
        self.assertEqual((agg['clips'], agg['estimated']), (2, 1))
        self.assertEqual(agg['failures'], {'TRACK_TOO_SHORT': 1})

    def test_ab_duplicates_are_benchmarked_once(self):
        self.assertEqual(len(load_pitches(PITCHES)), 16)

    def test_mp4_round_trip_through_analyze(self):
        with tempfile.TemporaryDirectory() as d:
            write_video(Path(d) / 'clip.mp4', self.frames, 120)
            (Path(d) / 'cam.json').write_text(json.dumps(self.cam.to_dict()))
            (Path(d) / 't.json').write_text(json.dumps({'frame_times_s': self.times.tolist()}))
            cli.main(['analyze', '--video', str(Path(d) / 'clip.mp4'), '--camera', str(Path(d) / 'cam.json'), '--times', str(Path(d) / 't.json'), '--out', str(Path(d) / 'out')])
            cand = json.loads((Path(d) / 'out' / 'candidates.json').read_text(encoding='utf-8'))
            self.assertTrue(cand['estimate']['ok'])
            self.assertTrue((Path(d) / 'out' / 'review.csv').exists())
            self.assertTrue((Path(d) / 'out' / 'contact_sheet.png').exists())


if __name__ == '__main__':
    unittest.main()
