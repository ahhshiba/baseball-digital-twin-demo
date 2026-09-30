"""Pinhole camera in the project world frame (x right, y toward pitcher, z up; metres; origin = rear tip of home plate).

OpenCV convention for the camera frame: x right, y down, z forward.
"""
from __future__ import annotations
import json
import math
from dataclasses import dataclass, field
import numpy as np

BALL_RADIUS_M = 0.0366
PLATE_PLANE_Y = 0.2159  # middle plane of home plate in world y


@dataclass
class Camera:
    K: np.ndarray
    R: np.ndarray  # world -> camera rotation
    t: np.ndarray  # world -> camera translation
    width: int
    height: int
    name: str = 'camera'
    meta: dict = field(default_factory=dict)

    @property
    def center(self) -> np.ndarray:
        return -self.R.T @ self.t

    @classmethod
    def look_at(cls, position, target, width=1280, height=720, hfov_deg=60.0, name='camera', up=(0, 0, 1)):
        c, tgt, up = (np.asarray(v, float) for v in (position, target, up))
        fwd = tgt - c
        fwd /= np.linalg.norm(fwd)
        right = np.cross(fwd, up)
        if np.linalg.norm(right) < 1e-9:
            raise ValueError('camera looks straight along the up vector')
        right /= np.linalg.norm(right)
        down = np.cross(fwd, right)
        R = np.vstack([right, down, fwd])
        f = (width / 2) / math.tan(math.radians(hfov_deg) / 2)
        K = np.array([[f, 0, width / 2], [0, f, height / 2], [0, 0, 1.0]])
        return cls(K, R, -R @ c, width, height, name, {'position': list(map(float, c)), 'target': list(map(float, tgt)), 'hfov_deg': hfov_deg})

    def to_camera(self, X):
        return (self.R @ np.asarray(X, float).T).T + self.t

    def project(self, X):
        """World points (N,3) -> pixels (N,2) and depth (N,). Points behind the camera get NaN pixels."""
        Xc = self.to_camera(np.atleast_2d(X))
        z = Xc[:, 2]
        with np.errstate(divide='ignore', invalid='ignore'):
            uv = (self.K @ Xc.T).T
            uv = uv[:, :2] / uv[:, 2:3]
        uv[z <= 1e-6] = np.nan
        return uv, z

    def pixel_radius(self, X, radius_m=BALL_RADIUS_M):
        _, z = self.project(X)
        return self.K[0, 0] * radius_m / z

    def ray(self, uv):
        """Pixels (N,2) -> unit ray directions in world (N,3), from camera center."""
        uv = np.atleast_2d(uv)
        pts = np.column_stack([uv, np.ones(len(uv))])
        d = (self.R.T @ (np.linalg.inv(self.K) @ pts.T)).T
        return d / np.linalg.norm(d, axis=1, keepdims=True)

    def to_dict(self):
        return {'name': self.name, 'width': self.width, 'height': self.height, 'K': self.K.tolist(), 'R': self.R.tolist(), 't': self.t.tolist(), 'meta': self.meta}

    @classmethod
    def from_dict(cls, d):
        return cls(np.array(d['K'], float), np.array(d['R'], float), np.array(d['t'], float), int(d['width']), int(d['height']), d.get('name', 'camera'), d.get('meta', {}))


# Field reference points usable for calibration of real footage (world metres; replace with surveyed values).
FIELD_POINTS = {
    'plate_rear_tip': (0.0, 0.0, 0.0), 'plate_left_back': (-0.2159, 0.2159, 0.0), 'plate_right_back': (0.2159, 0.2159, 0.0),
    'plate_left_front': (-0.2159, 0.4318, 0.0), 'plate_right_front': (0.2159, 0.4318, 0.0),
    'rubber_left': (-0.3048, 18.4404 + 0.0762, 0.254), 'rubber_right': (0.3048, 18.4404 + 0.0762, 0.254),
    'first_base': (19.397, 19.397, 0.0), 'second_base': (0.0, 38.795, 0.0), 'third_base': (-19.397, 19.397, 0.0),
}


def calibrate(calib: dict) -> Camera:
    """Build a camera from pixel <-> world correspondences (>= 4 points) with solvePnP.

    calib = {"width":1920,"height":1080,"hfov_deg":70 or "focal_px":1400,
             "points":[{"name":"plate_rear_tip","px":[u,v]} | {"world":[x,y,z],"px":[u,v]}, ...]}
    Lens distortion is ignored: undistort the footage first if the lens is wide.
    """
    import cv2
    w, h = int(calib['width']), int(calib['height'])
    f = float(calib['focal_px']) if 'focal_px' in calib else (w / 2) / math.tan(math.radians(float(calib['hfov_deg'])) / 2)
    K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1.0]])
    world, px = [], []
    for p in calib['points']:
        world.append(p['world'] if 'world' in p else FIELD_POINTS[p['name']])
        px.append(p['px'])
    if len(world) < 4:
        raise ValueError('at least 4 correspondences are required')
    ok, rvec, tvec = cv2.solvePnP(np.array(world, float), np.array(px, float), K, None, flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        raise RuntimeError('solvePnP failed')
    R, _ = cv2.Rodrigues(rvec)
    cam = Camera(K, R, tvec.ravel(), w, h, calib.get('name', 'calibrated'), {'source': 'solvePnP'})
    uv, _ = cam.project(np.array(world, float))
    cam.meta['reprojection_rmse_px'] = float(np.sqrt(np.nanmean(np.sum((uv - np.array(px, float)) ** 2, axis=1))))
    return cam


def load_calibration(path) -> Camera:
    with open(path, encoding='utf-8') as fh:
        d = json.load(fh)
    return Camera.from_dict(d) if 'K' in d else calibrate(d)
