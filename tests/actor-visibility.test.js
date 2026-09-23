import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeAthlete } from '../src/actors.js';
import { setActorOpacity } from '../src/actor-visibility.js';

test('pitcher and catcher body, uniform and equipment fade and restore together',()=>{
  for(const role of ['pitcher','catcher']){
    const actor=makeAthlete(role,17);let count=0;actor.traverse(o=>{if(o.isMesh)count++});assert.ok(count>=6);assert.ok(actor.userData.partCount>40);assert.ok(count<actor.userData.partCount);
    setActorOpacity(actor,.25);actor.traverse(o=>{if(!o.isMesh)return;assert.equal(o.material.opacity,.25);assert.equal(o.material.depthWrite,false);assert.equal(o.castShadow,false)});
    setActorOpacity(actor,.4);actor.traverse(o=>{if(o.isMesh)assert.equal(o.material.opacity,.4)});
    setActorOpacity(actor,1);actor.traverse(o=>{if(!o.isMesh)return;assert.equal(o.material.opacity,1);assert.equal(o.material.transparent,false);assert.equal(o.material.depthWrite,true);assert.equal(o.castShadow,true)});
  }
});
test('filtering never mutates a shared material on another player or the ball',()=>{
  const material=new THREE.MeshStandardMaterial(),geometry=new THREE.SphereGeometry(.1),a=new THREE.Group(),b=new THREE.Mesh(geometry,material);
  a.add(new THREE.Mesh(geometry,material));setActorOpacity(a,.2);assert.equal(b.material.opacity,1);assert.notEqual(a.children[0].material,b.material);
});
test('multi-material meshes preserve their original transparency when restored',()=>{
  const actor=new THREE.Group(),a=new THREE.MeshStandardMaterial({opacity:.7,transparent:true,depthWrite:false}),b=new THREE.MeshStandardMaterial();
  const m=new THREE.Mesh(new THREE.BoxGeometry(),[a,b]);actor.add(m);
  setActorOpacity(actor,.5);assert.equal(m.material[0].opacity,.35);setActorOpacity(actor,1);assert.equal(m.material[0].opacity,.7);assert.equal(m.material[0].depthWrite,false);assert.equal(m.material[1].transparent,false);
});
