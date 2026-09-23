import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PITCHES, BALL_RADIUS, zoneForHeight, decideDemo, makePitch, positionAt, makeRecord } from '../src/pitch.js';

test('all pitch profiles preserve selected release speed and intersect the declared plane',()=>{
  for(const type of Object.keys(PITCHES))for(const height of [140,180,220])for(const scenario of ['strike','ball','edge','occluded']){
    const p=makePitch(type,scenario,height),end=positionAt(p,p.duration);
    end.forEach((v,i)=>assert.ok(Math.abs(v-p.target[i])<1e-9));
    assert.ok(Math.abs(Math.hypot(...p.velocity)*3.6-PITCHES[type].speed)<1e-8);
    assert.ok(p.duration>0&&p.duration<1);
    assert.equal(p.decision.call,scenario==='strike'?'STRIKE':scenario==='ball'?'BALL':'REVIEW');
  }
});
test('ball radius is accounted for at sides and rounded corners',()=>{
  const z=zoneForHeight(180),mid=(z.top+z.bottom)/2;
  assert.equal(decideDemo(0,mid,z).call,'STRIKE');
  assert.equal(decideDemo(z.right+BALL_RADIUS-.02,mid,z).call,'STRIKE');
  assert.equal(decideDemo(z.right+BALL_RADIUS,mid,z).call,'REVIEW');
  assert.equal(decideDemo(z.right+.1,mid,z).call,'BALL');
  // Would be incorrectly called a strike by separately expanded x/y intervals.
  assert.equal(decideDemo(z.right+.03,z.top+.03,z,{uncertaintyM:0}).call,'BALL');
  assert.equal(decideDemo(0,mid,z,{valid:false}).call,'REVIEW');
});
test('records distinguish synthetic trajectories from missing hardware measurements',()=>{
  const r=makeRecord(makePitch('SL'),'bullpen',1);
  assert.equal(r.source,'synthetic');assert.equal(r.pitch_type.source,'user-selected-demo');
  assert.equal(r.trajectory.samples.length,241);assert.equal(r.metrics.spin_source,'synthetic-preset');
  assert.equal(r.acquisition.calibration_id,null);assert.deepEqual(r.acquisition.camera_frames,[]);
  assert.equal(r.metrics.exit_velocity_kmh,null);assert.equal(r.metrics.oaa,null);assert.equal(r.latency_ms,null);
  assert.equal(r.abs.official,false);
});
