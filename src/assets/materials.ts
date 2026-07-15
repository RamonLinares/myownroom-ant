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

// ---------------------------------------------------------------- finishes
// Wall and floor finishes are drawn in grayscale and tinted through
// material.color, so any finish can wear any color.

export type WallFinish = 'paint' | 'stripes' | 'dots' | 'sprigs';
export type FloorFinish = 'planks' | 'chevron' | 'tiles' | 'carpet';

export const WALL_FINISHES: WallFinish[] = ['paint', 'stripes', 'dots', 'sprigs'];
export const FLOOR_FINISHES: FloorFinish[] = ['planks', 'chevron', 'tiles', 'carpet'];

/** World-units-to-UV scale per floor finish (pattern density). */
export const FLOOR_TEX_SCALE: Record<FloorFinish, number> = {
  planks: 0.245,
  chevron: 0.55,
  tiles: 0.5,
  carpet: 0.35,
};

const finishCache = new Map<string, THREE.CanvasTexture>();

export function wallFinishTexture(style: WallFinish): THREE.CanvasTexture {
  const key = `w:${style}`;
  const cached = finishCache.get(key);
  if (cached) return cached;
  const tex = makeTexture(256, (ctx, s) => {
    ctx.fillStyle = '#fbfbfb';
    ctx.fillRect(0, 0, s, s);
    if (style === 'paint') {
      for (let i = 0; i < 2600; i++) {
        const v = 232 + rand() * 20 | 0;
        ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
        ctx.fillRect(rand() * s, rand() * s, 1.4, 1.4);
      }
    } else if (style === 'stripes') {
      for (let x = 0; x < s; x += 64) {
        ctx.fillStyle = '#efefef';
        ctx.fillRect(x + 32, 0, 32, s);
        ctx.fillStyle = '#e2e2e2';
        ctx.fillRect(x + 30, 0, 2, s);
        ctx.fillRect(x + 64 - 2, 0, 2, s);
      }
    } else if (style === 'dots') {
      ctx.fillStyle = '#dcdcdc';
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const x = col * 32 + (row % 2 ? 16 : 0);
          const y = row * 32 + 16;
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // sprigs: little stems with leaves on a loose grid
      ctx.strokeStyle = '#d2d2d2';
      ctx.fillStyle = '#d8d8d8';
      ctx.lineWidth = 2;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const x = col * 64 + 32 + (row % 2 ? 18 : 0);
          const y = row * 64 + 30;
          const flip = (row + col) % 2 ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(x, y + 16);
          ctx.quadraticCurveTo(x + 7 * flip, y + 2, x + 3 * flip, y - 14);
          ctx.stroke();
          for (const [dx, dy, rx] of [[6, 4, 6], [-4, -2, 5], [4, -10, 5]] as Array<[number, number, number]>) {
            ctx.beginPath();
            ctx.ellipse(x + dx * flip, y + dy, rx, 3, flip * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  });
  finishCache.set(key, tex);
  return tex;
}

export function floorFinishTexture(style: FloorFinish): THREE.CanvasTexture {
  const key = `f:${style}`;
  const cached = finishCache.get(key);
  if (cached) return cached;
  const tex = makeTexture(style === 'planks' ? 512 : 256, (ctx, s) => {
    if (style === 'planks') {
      const plankH = s / 8;
      for (let row = 0; row < 8; row++) {
        const offset = (row % 2) * s * 0.33;
        for (let col = -1; col < 3; col++) {
          const x = col * s * 0.5 + offset;
          const tone = 196 + rand() * 30 | 0;
          ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
          ctx.fillRect(x, row * plankH, s * 0.5 - 2, plankH - 2);
          ctx.strokeStyle = 'rgba(80,80,80,0.55)';
          ctx.strokeRect(x, row * plankH, s * 0.5 - 2, plankH - 2);
          for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = `rgba(120,120,120,${0.1 + rand() * 0.15})`;
            ctx.lineWidth = 0.8;
            const gy = row * plankH + rand() * plankH;
            ctx.beginPath();
            ctx.moveTo(x, gy);
            ctx.lineTo(x + s * 0.5, gy + (rand() - 0.5) * 4);
            ctx.stroke();
          }
        }
      }
    } else if (style === 'chevron') {
      const img = ctx.createImageData(s, s);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const phase = x % 128;
          const zig = phase < 64 ? phase : 128 - phase;
          const v = y + zig;
          const band = Math.floor(v / 32);
          const t = v % 32;
          let tone = band % 2 ? 208 : 190;
          if (t < 2) tone = 130;
          tone += ((x * 31 + y * 17) % 7) - 3;
          const i = (y * s + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = tone;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    } else if (style === 'tiles') {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const tone = 222 + ((row * 7 + col * 13) % 5) * 4;
          ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
          ctx.fillRect(col * 64, row * 64, 64, 64);
          ctx.strokeStyle = '#9a9a9a';
          ctx.lineWidth = 3;
          ctx.strokeRect(col * 64 + 1.5, row * 64 + 1.5, 61, 61);
        }
      }
    } else {
      // carpet: dense speckle over a soft weave
      ctx.fillStyle = '#e2e2e2';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 4) {
        ctx.fillStyle = y % 8 ? 'rgba(200,200,200,0.5)' : 'rgba(225,225,225,0.5)';
        ctx.fillRect(0, y, s, 2);
      }
      for (let i = 0; i < 5200; i++) {
        const v = 190 + rand() * 55 | 0;
        ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
        ctx.fillRect(rand() * s, rand() * s, 1.6, 1.6);
      }
    }
  });
  finishCache.set(key, tex);
  return tex;
}

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
