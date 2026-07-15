import * as THREE from 'three';

function makeTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

let seed = 7;
function rand(): number {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

/** Grayscale wood grain, tinted through material.color. */
export const woodTexture = makeTexture(256, (ctx, s) => {
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const y = rand() * s;
    ctx.strokeStyle = `rgba(${90 + rand() * 60 | 0},${85 + rand() * 55 | 0},${80 + rand() * 50 | 0},${0.12 + rand() * 0.18})`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= s; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 2.5 + (rand() - 0.5) * 3);
    ctx.stroke();
  }
});

/** Soft woven fabric detail, tinted through material.color. */
export const fabricTexture = makeTexture(128, (ctx, s) => {
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 3) {
    for (let x = 0; x < s; x += 3) {
      const v = 200 + ((x + y) % 6 === 0 ? -26 : (rand() * 26 - 13)) | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
});

export const floorTexture = makeTexture(512, (ctx, s) => {
  const plankH = s / 8;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * s * 0.33;
    for (let col = -1; col < 3; col++) {
      const x = col * s * 0.5 + offset;
      const tone = 168 + rand() * 34;
      ctx.fillStyle = `rgb(${tone | 0},${tone * 0.76 | 0},${tone * 0.55 | 0})`;
      ctx.fillRect(x, row * plankH, s * 0.5 - 2, plankH - 2);
      ctx.strokeStyle = 'rgba(70,45,25,0.5)';
      ctx.strokeRect(x, row * plankH, s * 0.5 - 2, plankH - 2);
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(110,75,45,${0.1 + rand() * 0.15})`;
        ctx.lineWidth = 0.8;
        const gy = row * plankH + rand() * plankH;
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + s * 0.5, gy + (rand() - 0.5) * 4);
        ctx.stroke();
      }
    }
  }
});

export const wallTexture = makeTexture(256, (ctx, s) => {
  ctx.fillStyle = '#e9e2d5';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const v = 222 + rand() * 22 | 0;
    ctx.fillStyle = `rgba(${v},${v - 6},${v - 16},0.35)`;
    ctx.fillRect(rand() * s, rand() * s, 1.4, 1.4);
  }
});

export const rugTexture = makeTexture(256, (ctx, s) => {
  ctx.fillStyle = '#d6d6d6';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(120,120,120,0.65)';
  ctx.lineWidth = 7;
  ctx.strokeRect(14, 14, s - 28, s - 28);
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, s - 60, s - 60);
  for (let i = 0; i < 1800; i++) {
    const v = 190 + rand() * 40 | 0;
    ctx.fillStyle = `rgba(${v},${v},${v},0.3)`;
    ctx.fillRect(rand() * s, rand() * s, 2, 2);
  }
});

export function wood(color: string, rough = 0.62): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, map: woodTexture, roughness: rough, metalness: 0.02 });
}

export function fabric(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, map: fabricTexture, roughness: 0.94, metalness: 0 });
}

export function matte(color: string, rough = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.03 });
}

export function metal(color: string, rough = 0.35): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.8 });
}
