import * as THREE from 'three';
import {
  floorFinishTexture, wallFinishTexture, FLOOR_TEX_SCALE, matte,
  type WallFinish, type FloorFinish,
} from '../assets/materials';

export type RoomShape = 'rect' | 'l' | 't' | 'u';

export interface RoomConfig {
  w: number;
  d: number;
  shape: RoomShape;
  wallStyle: WallFinish;
  wallColor: string;
  floorStyle: FloorFinish;
  floorColor: string;
}

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface WallSeg {
  cx: number;
  cz: number;
  len: number;
  rotY: number;
  /** Wall normal (points into the room). */
  nx: number;
  nz: number;
}

export const ROOM_H = 3.1;
export const DEFAULT_ROOM: RoomConfig = {
  w: 9, d: 7, shape: 'rect',
  wallStyle: 'paint', wallColor: '#e9e2d5',
  floorStyle: 'planks', floorColor: '#cf9d6d',
};
export const ROOM_SHAPES: RoomShape[] = ['rect', 'l', 't', 'u'];
export const WALL_COLORS = ['#e9e2d5', '#f2d8c8', '#cfdcd2', '#c8d4e2', '#e8ccd4', '#b8b0a2'];
export const FLOOR_COLORS = ['#cf9d6d', '#a8734a', '#8a5a3a', '#cbb896', '#b8b0a2', '#7d8a94'];

/** The floor plan as a union of non-overlapping, edge-adjacent rectangles. */
export function roomRects(cfg: RoomConfig): Rect[] {
  const { w, d, shape } = cfg;
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  switch (shape) {
    case 'l': {
      const nw = w * 0.42, nd = d * 0.4;
      return [
        { x0, z0, x1, z1: z1 - nd },
        { x0, z0: z1 - nd, x1: x1 - nw, z1 },
      ];
    }
    case 't': {
      const sw = w * 0.46, sd = d * 0.42;
      return [
        { x0, z0, x1, z1: z1 - sd },
        { x0: -sw / 2, z0: z1 - sd, x1: sw / 2, z1 },
      ];
    }
    case 'u': {
      const aw = w * 0.3, ad = d * 0.45;
      return [
        { x0, z0, x1, z1: z1 - ad },
        { x0, z0: z1 - ad, x1: x0 + aw, z1 },
        { x0: x1 - aw, z0: z1 - ad, x1, z1 },
      ];
    }
    default:
      return [{ x0, z0, x1, z1 }];
  }
}

type Interval = [number, number];

function cutIntervals(base: Interval, cuts: Interval[]): Interval[] {
  let list: Interval[] = [base];
  for (const c of cuts) {
    const next: Interval[] = [];
    for (const [a, b] of list) {
      const lo = Math.max(a, c[0]);
      const hi = Math.min(b, c[1]);
      if (hi <= lo + 1e-4) {
        next.push([a, b]);
        continue;
      }
      if (lo > a + 1e-4) next.push([a, lo]);
      if (b > hi + 1e-4) next.push([hi, b]);
    }
    list = next;
  }
  return list.filter(([a, b]) => b - a > 0.05);
}

/** Boundary wall segments of the rect union; interior shared edges are removed. */
export function roomWalls(rects: Rect[]): WallSeg[] {
  const out: WallSeg[] = [];
  const eps = 1e-3;
  for (const r of rects) {
    const others = rects.filter((s) => s !== r);
    for (const [a, b] of cutIntervals([r.x0, r.x1], others.filter((s) => Math.abs(s.z1 - r.z0) < eps).map((s) => [s.x0, s.x1] as Interval))) {
      out.push({ cx: (a + b) / 2, cz: r.z0, len: b - a, rotY: 0, nx: 0, nz: 1 });
    }
    for (const [a, b] of cutIntervals([r.x0, r.x1], others.filter((s) => Math.abs(s.z0 - r.z1) < eps).map((s) => [s.x0, s.x1] as Interval))) {
      out.push({ cx: (a + b) / 2, cz: r.z1, len: b - a, rotY: Math.PI, nx: 0, nz: -1 });
    }
    for (const [a, b] of cutIntervals([r.z0, r.z1], others.filter((s) => Math.abs(s.x1 - r.x0) < eps).map((s) => [s.z0, s.z1] as Interval))) {
      out.push({ cx: r.x0, cz: (a + b) / 2, len: b - a, rotY: Math.PI / 2, nx: 1, nz: 0 });
    }
    for (const [a, b] of cutIntervals([r.z0, r.z1], others.filter((s) => Math.abs(s.x0 - r.x1) < eps).map((s) => [s.z0, s.z1] as Interval))) {
      out.push({ cx: r.x1, cz: (a + b) / 2, len: b - a, rotY: -Math.PI / 2, nx: -1, nz: 0 });
    }
  }
  return out;
}

/**
 * Builds the room shell: floor planes per rect and single-sided walls facing
 * the interior, so walls between the camera and the room are backface-culled
 * (dollhouse view) from any orbit angle.
 */
export function buildRoomShell(cfg: RoomConfig): THREE.Group {
  const g = new THREE.Group();
  g.name = 'room-shell';
  const rects = roomRects(cfg);
  const texScale = FLOOR_TEX_SCALE[cfg.floorStyle];
  for (const r of rects) {
    const rw = r.x1 - r.x0;
    const rd = r.z1 - r.z0;
    const tex = floorFinishTexture(cfg.floorStyle).clone();
    tex.needsUpdate = true;
    tex.repeat.set(rw * texScale, rd * texScale);
    tex.offset.set(((r.x0 * texScale) % 1 + 1) % 1, ((-r.z1 * texScale) % 1 + 1) % 1);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(rw, rd),
      new THREE.MeshStandardMaterial({
        map: tex,
        color: cfg.floorColor,
        roughness: cfg.floorStyle === 'carpet' ? 0.96 : cfg.floorStyle === 'tiles' ? 0.35 : 0.55,
        metalness: 0.04,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
    floor.receiveShadow = true;
    floor.name = 'floor';
    g.add(floor);
  }
  const baseMat = matte('#f2ead9', 0.7);
  for (const seg of roomWalls(rects)) {
    const wallTex = wallFinishTexture(cfg.wallStyle).clone();
    wallTex.needsUpdate = true;
    // Pattern density stays constant regardless of wall length.
    wallTex.repeat.set(Math.max(1, seg.len * 0.55), 1.55);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: cfg.wallColor, roughness: 0.92 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(seg.len, ROOM_H), wallMat);
    wall.position.set(seg.cx, ROOM_H / 2, seg.cz);
    wall.rotation.y = seg.rotY;
    wall.receiveShadow = true;
    wall.name = 'wall';
    g.add(wall);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(seg.len, 0.14), baseMat);
    base.position.set(seg.cx + seg.nx * 0.012, 0.07, seg.cz + seg.nz * 0.012);
    base.rotation.y = seg.rotY;
    g.add(base);
  }
  return g;
}
