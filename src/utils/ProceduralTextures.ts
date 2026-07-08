import * as THREE from 'three';

/**
 * Procedurally generates simple, lightweight canvas-based textures so the game
 * never depends on external network assets. All textures are small (<=256px)
 * to keep mobile memory/performance costs low.
 */
function makeCanvas(size = 128): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function woodPlankTexture(base = '#7a4a2a', repeat = 4): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, i * 32, 128, 2);
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    const y = Math.random() * 128;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(32, y + Math.random() * 6 - 3, 96, y + Math.random() * 6 - 3, 128, y);
    ctx.stroke();
  }
  return toTexture(canvas, repeat);
}

export function roofTileTexture(base = '#2c3e50', repeat = 3): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < 128; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      const offset = (y / 16) % 2 === 0 ? 0 : 8;
      ctx.beginPath();
      ctx.arc(x + offset, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return toTexture(canvas, repeat);
}

export function cobblestoneTexture(repeat = 12): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = '#8d8272';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = 6 + Math.random() * 8;
    ctx.fillStyle = `rgba(${100 + Math.random() * 40 | 0}, ${90 + Math.random() * 40 | 0}, ${75 + Math.random() * 30 | 0}, 1)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();
  }
  return toTexture(canvas, repeat);
}

export function riverTexture(repeat = 6): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#3d6f7a');
  grad.addColorStop(1, '#274d57');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    const y = Math.random() * 128;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(32, y + 6, 96, y - 6, 128, y);
    ctx.stroke();
  }
  return toTexture(canvas, repeat);
}

export function clothBannerTexture(colorA = '#b83b2e', colorB = '#e8c15a'): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(64);
  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, 64, 10);
  ctx.fillRect(0, 54, 64, 10);
  ctx.fillStyle = '#20140a';
  ctx.font = 'bold 28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('酒', 32, 40);
  return toTexture(canvas, 1);
}

export function paperTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(64);
  ctx.fillStyle = '#ead9ad';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(120,90,40,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 8, 1);
  }
  return toTexture(canvas, 1);
}

export function groundDirtTexture(repeat = 16): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${90 + Math.random() * 40 | 0}, ${75 + Math.random() * 35 | 0}, ${50 + Math.random() * 25 | 0}, 0.5)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  return toTexture(canvas, repeat);
}

export function wallPlasterTexture(repeat = 2): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128);
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
  }
  return toTexture(canvas, repeat);
}
