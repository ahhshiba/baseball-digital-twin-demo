import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNodes } from '../src/nodes.js';
import { activityBoundary, insidePolygon, boundaryDistance } from '../src/deployment.js';

test('all equipment envelopes and mounting brackets stay outside the conceptual activity area',()=>{
  for(const stage of ['poc','bullpen','pilot','full'])for(const near of [false,true]){
    const polygon=activityBoundary(stage);
    for(const n of getNodes(stage,near)){
      for(let i=0;i<=10;i++){
        const x=n.pos[0]+(n.anchor[0]-n.pos[0])*i/10,z=n.pos[2]+(n.anchor[2]-n.pos[2])*i/10;
        assert.equal(insidePolygon([x,z],polygon),false,`${stage}/${n.id} mount enters activity area`);
        // 0.65 m bounds the displayed device/cabinet/support geometry; not a venue safety standard.
        assert.ok(boundaryDistance([x,z],polygon)>.65,`${stage}/${n.id} envelope intersects activity area`);
      }
      assert.ok(['structure','cabinet'].includes(n.mountKind));
    }
  }
});
test('activity area includes foul territory and rejects the previous on-field positions',()=>{
  const field=activityBoundary('full');
  for(const old of [[-3.6,-13],[1.3,-2],[-60,-83],[3,2]])assert.equal(insidePolygon(old,field),true);
  assert.equal(insidePolygon([10,-5],field),true,'foul territory still counts as playable');
  const c=getNodes('full',false).find(n=>n.id==='cam-c');
  assert.deepEqual(c.pos,[-32,8,-18]);assert.match(c.tradeoff,/球縫/);
  assert.equal(insidePolygon([c.pos[0],c.pos[2]],field),false);
});
