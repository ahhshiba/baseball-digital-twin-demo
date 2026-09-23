// Canonical demo coordinates: metres; x = catcher's right, y = up,
// z = toward catcher. Origin = rear tip of home plate. Not Statcast coordinates.
export const PLATE = { width: 0.4318, depth: 0.4318, planeZ: -0.2159, rubberZ: -18.4404 };
export const BALL_RADIUS = 0.0366;
export const PITCHES = {
  FF: { name: '四縫線速球', speed: 148, rpm: 2350, ax: -2.5, ay: -4.8, color: '#ffbf65' },
  SL: { name: '滑球', speed: 132, rpm: 2580, ax: 6, ay: -10.8, color: '#a5a1ff' },
  CU: { name: '曲球', speed: 119, rpm: 2710, ax: 2.8, ay: -17, color: '#67d9ed' },
  CH: { name: '變速球', speed: 129, rpm: 1740, ax: -5.8, ay: -8.4, color: '#74e4b1' },
};

export function zoneForHeight(heightCm = 180) {
  return { left: -PLATE.width / 2, right: PLATE.width / 2, bottom: heightCm / 100 * .27,
    top: heightCm / 100 * .535, planeZ: PLATE.planeZ, profile: 'MLB-2026-reference-demo-v1' };
}

// A rounded rectangle (rectangle dilated by the ball's radius) is necessary:
// expanding x/y bounds independently produces incorrect corner decisions.
export function signedDistanceToZone(x, y, zone) {
  const cx = (zone.left + zone.right) / 2, cy = (zone.top + zone.bottom) / 2;
  const qx = Math.abs(x - cx) - (zone.right - zone.left) / 2;
  const qy = Math.abs(y - cy) - (zone.top - zone.bottom) / 2;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
}

export function decideDemo(x, y, zone, { uncertaintyM = .012, valid = true } = {}) {
  const margin = BALL_RADIUS - signedDistanceToZone(x, y, zone);
  const call = !valid || Math.abs(margin) <= uncertaintyM ? 'REVIEW' : margin > 0 ? 'STRIKE' : 'BALL';
  return { call, marginM: margin, uncertaintyM, qualityValid: valid,
    method: 'demo-circle-vs-rectangle-at-selected-plane', official: false };
}

export function positionAt(pitch, t) {
  return pitch.release.map((v, i) => v + pitch.velocity[i] * t + .5 * pitch.acceleration[i] * t * t);
}
export function velocityAt(pitch, t) { return pitch.velocity.map((v, i) => v + pitch.acceleration[i] * t); }

export function makePitch(type = 'FF', scenario = 'strike', heightCm = 180) {
  const profile = PITCHES[type], zone = zoneForHeight(heightCm);
  const target = [scenario === 'ball' ? .38 : scenario === 'edge' ? zone.right + BALL_RADIUS : -.065,
    (zone.top + zone.bottom) / 2 + (type === 'CU' ? -.08 : .025), zone.planeZ];
  const release = [.46, 1.83, -16.6];
  const acceleration = [profile.ax, profile.ay, -1.5];
  const speed = profile.speed / 3.6;
  const initialVelocity = t => target.map((v, i) => (v - release[i] - .5 * acceleration[i] * t * t) / t);
  let lo = .2, hi = .8;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (Math.hypot(...initialVelocity(mid)) > speed) lo = mid; else hi = mid;
  }
  const duration = (lo + hi) / 2, velocity = initialVelocity(duration);
  const pitch = { type, profile, scenario, heightCm, zone, release, velocity, acceleration, duration, target };
  pitch.decision = decideDemo(target[0], target[1], zone, { valid: scenario !== 'occluded' });
  return pitch;
}

export function makeRecord(pitch, stage, index) {
  const endV = velocityAt(pitch, pitch.duration);
  const samples = Array.from({ length: 241 }, (_, i) => {
    const t = pitch.duration * i / 240;
    return { t_s: t, position_m: positionAt(pitch, t), velocity_mps: velocityAt(pitch, t) };
  });
  return {
    schema_version: 'demo-pitch/2.0', id: `demo-${Date.now()}-${index}`, recorded_at: new Date().toISOString(),
    source: 'synthetic', stage, coordinate_frame: 'home-rear-tip:x-catcher-right,y-up,z-catcher;m',
    pitch_type: { label: pitch.type, source: 'user-selected-demo', confidence: null, model_version: null },
    batter: { id: 'demo-batter', height_cm: pitch.heightCm, height_source: 'demo-input' },
    trajectory: { model: 'synthetic-constant-acceleration', release_m: pitch.release, initial_velocity_mps: pitch.velocity,
      acceleration_mps2: pitch.acceleration, samples },
    metrics: { release_speed_kmh: Math.hypot(...pitch.velocity) * 3.6, plate_speed_kmh: Math.hypot(...endV) * 3.6,
      release_extension_m: pitch.release[2] - PLATE.rubberZ, flight_time_s: pitch.duration,
      plate_x_m: pitch.target[0], plate_height_m: pitch.target[1], plate_plane_z_m: pitch.zone.planeZ,
      vaa_deg: Math.atan2(endV[1], Math.hypot(endV[0], endV[2])) * 180 / Math.PI,
      spin_rpm: pitch.profile.rpm, spin_source: 'synthetic-preset', spin_axis: null,
      exit_velocity_kmh: null, launch_angle_deg: null, bat_speed_kmh: null, oaa: null },
    abs: { ...pitch.decision, zone: pitch.zone, ball_radius_m: BALL_RADIUS },
    acquisition: { camera_frames: [], radar_iq: [], calibration_id: null, clock_sync_error_us: null,
      measurement_covariance: null, note: 'No hardware measurements; trajectory samples are generated, not sensor raw data.' },
    game_events: null, fielding_tracks: [], latency_ms: null,
  };
}
