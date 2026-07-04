import * as THREE from 'three';
import { riverTexture } from '../utils/ProceduralTextures';

/** Animated, reflective-looking river plane (lightweight — no runtime reflections, just scrolling texture + shimmer). */
export class River {
  mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private time = 0;

  constructor(width: number, length: number) {
    const tex = riverTexture(10);
    this.material = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0x5a95a3,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
    });
    const geo = new THREE.PlaneGeometry(length, width, 1, 1);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
  }

  update(dt: number): void {
    this.time += dt;
    const tex = this.material.map;
    if (tex) {
      tex.offset.x = (this.time * 0.02) % 1;
      tex.offset.y = (this.time * 0.01) % 1;
    }
  }
}
