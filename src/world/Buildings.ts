import * as THREE from 'three';

/** Shared geometries reused across the whole city to minimise draw calls / memory. */
export const SharedGeo = {
  post: new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8),
  crate: new THREE.BoxGeometry(0.6, 0.6, 0.6),
  lanternBody: new THREE.SphereGeometry(0.22, 10, 8),
  lanternCap: new THREE.ConeGeometry(0.1, 0.12, 8),
  reed: new THREE.CylinderGeometry(0.02, 0.03, 1.4, 5),
};

/** Builds a simple wooden post (used for stalls, fences, dock pilings). */
export function createPost(mat: THREE.Material, height = 3.2): THREE.Mesh {
  const geo = height === 3.2 ? SharedGeo.post : new THREE.CylinderGeometry(0.14, 0.16, height, 8);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A pitched roof made from two angled boxes, evoking upturned Chinese eaves. */
export function createPitchedRoof(width: number, depth: number, mat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const slopeLen = Math.sqrt((depth / 2) ** 2 + 1) * 1.05;
  const geo = new THREE.BoxGeometry(width + 0.6, 0.12, slopeLen);
  const left = new THREE.Mesh(geo, mat);
  left.rotation.x = Math.atan2(1, depth / 2);
  left.position.set(0, 0.5, depth / 4 + 0.1);
  left.castShadow = true;
  left.receiveShadow = true;
  const right = left.clone();
  right.rotation.x = -left.rotation.x;
  right.position.z = -left.position.z;
  group.add(left, right);

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.7, 0.12, 0.14), mat);
  ridge.position.set(0, 1.02, 0);
  group.add(ridge);
  return group;
}

/** A small hanging shop sign that gently sways; returns the group and an update fn. */
export function createHangingSign(text: string, color: number): { group: THREE.Group; update: (dt: number) => void } {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#e8d9b5';
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 122, 58);
  ctx.fillStyle = '#f3e6c8';
  ctx.font = 'bold 30px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), mat);
  plane.castShadow = true;
  const pivot = new THREE.Group();
  pivot.add(plane);
  plane.position.y = -0.25;
  group.add(pivot);
  let time = Math.random() * 10;
  const update = (dt: number) => {
    time += dt;
    pivot.rotation.z = Math.sin(time * 1.2) * 0.06;
  };
  return { group, update };
}

/** A cloth banner that waves via gentle per-vertex sine displacement. */
export function createClothBanner(
  mat: THREE.Material,
  width = 0.6,
  height = 1.6,
): { mesh: THREE.Mesh; update: (dt: number) => void } {
  const geo = new THREE.PlaneGeometry(width, height, 4, 6);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const basePositions = geo.attributes.position.array.slice();
  let time = Math.random() * 10;
  const update = (dt: number) => {
    time += dt;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = basePositions[i * 3 + 1];
      const wave = Math.sin(time * 2 + y * 2) * 0.04 * ((y + height / 2) / height);
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  };
  return { mesh, update };
}
