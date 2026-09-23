// Material state belongs to a mesh, not to a shared uniform palette. Clone once
// so filtering the pitcher can never also fade another player's jersey.
export function setActorOpacity(actor, opacity = 1) {
  const value = Number.isFinite(opacity) ? Math.max(.08, Math.min(1, opacity)) : 1;
  actor.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!mesh.userData.opacityBase) {
      const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const own = originals.map(material => material.clone());
      mesh.material = Array.isArray(mesh.material) ? own : own[0];
      mesh.userData.opacityBase = own.map(m => ({ opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite }));
      mesh.userData.shadowBase = mesh.castShadow;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((m, i) => {
      const base = mesh.userData.opacityBase[i];
      m.opacity = base.opacity * value;
      m.transparent = value < 1 || base.transparent;
      m.depthWrite = value < 1 ? false : base.depthWrite;
      m.needsUpdate = true;
    });
    mesh.castShadow = value < 1 ? false : mesh.userData.shadowBase;
  });
  actor.userData.displayOpacity = value;
}
