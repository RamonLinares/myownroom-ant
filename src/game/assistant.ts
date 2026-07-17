import * as THREE from 'three';
import { getDef } from '../assets/catalog';
import { roomRects, type Rect, type RoomConfig, type RoomShape } from './room';
import { STYLE_RECIPES, type StyleRecipe } from './styles';
import type { SavedItem, SavedRoom } from './state';

/**
 * The room assistant: a short interview whose answers feed a procedural
 * room generator. Every build is randomized within the chosen recipe, so
 * the same answers keep producing fresh rooms.
 */

export interface AssistantAnswers {
  purpose: 'living' | 'bedroom' | 'kitchen' | 'office' | 'kids' | 'studio';
  style: string;
  size: 'cozy' | 'comfy' | 'grand';
  tidiness: 'tidy' | 'lived-in' | 'collector';
  touch: 'plants' | 'books' | 'music' | 'play' | 'party' | 'surprise';
}

export interface AssistantOption {
  id: string;
  emoji: string;
  label: string;
  blurb: string;
}

export interface AssistantQuestion {
  id: keyof AssistantAnswers;
  prompt: string;
  options: AssistantOption[];
}

export const ASSISTANT_QUESTIONS: AssistantQuestion[] = [
  {
    id: 'purpose',
    prompt: 'What is this room for?',
    options: [
      { id: 'living', emoji: '🛋️', label: 'Living room', blurb: 'Sofa, coffee table, somewhere to flop' },
      { id: 'bedroom', emoji: '🛏️', label: 'Bedroom', blurb: 'A calm place to sleep and dress' },
      { id: 'kitchen', emoji: '🍳', label: 'Kitchen', blurb: 'Counters, stove, and a table to eat at' },
      { id: 'office', emoji: '💻', label: 'Home office', blurb: 'Desk, screens, serious plants' },
      { id: 'kids', emoji: '🧸', label: 'Kids’ room', blurb: 'Toys everywhere, on purpose' },
      { id: 'studio', emoji: '🏠', label: 'Studio flat', blurb: 'Bed, kitchen corner and sofa in one' },
    ],
  },
  {
    id: 'style',
    prompt: 'Which look feels like you?',
    options: [
      { id: 'scandi', emoji: '🌿', label: 'Scandinavian', blurb: 'Light wood, soft neutrals, daylight' },
      { id: 'cottage', emoji: '🍯', label: 'Cozy Cottage', blurb: 'Warm sprigs, sunset light, honey wood' },
      { id: 'retro', emoji: '📻', label: 'Retro', blurb: 'Stripes, chevron parquet, bold color' },
      { id: 'minimal', emoji: '⬜', label: 'Minimalist', blurb: 'Clean lines and quiet tones' },
      { id: 'academia', emoji: '🕯️', label: 'Dark Academia', blurb: 'Moody walls, old wood, night light' },
    ],
  },
  {
    id: 'size',
    prompt: 'How big should it be?',
    options: [
      { id: 'cozy', emoji: '🐚', label: 'Cozy', blurb: 'Snug — everything within arm’s reach' },
      { id: 'comfy', emoji: '🏡', label: 'Comfortable', blurb: 'Room to breathe, nothing echoes' },
      { id: 'grand', emoji: '🏰', label: 'Grand', blurb: 'Huge — sometimes with an L-shaped nook' },
    ],
  },
  {
    id: 'tidiness',
    prompt: 'How lived-in should it feel?',
    options: [
      { id: 'tidy', emoji: '🧹', label: 'Tidy', blurb: 'Just the essentials, neatly placed' },
      { id: 'lived-in', emoji: '☕', label: 'Lived-in', blurb: 'A few books and trinkets around' },
      { id: 'collector', emoji: '🗃️', label: 'Collector', blurb: 'Every shelf tells a story' },
    ],
  },
  {
    id: 'touch',
    prompt: 'Pick a personal touch:',
    options: [
      { id: 'plants', emoji: '🪴', label: 'Plant corner', blurb: 'A small indoor jungle' },
      { id: 'books', emoji: '📚', label: 'Reading nook', blurb: 'Armchair, lamp, stacks of books' },
      { id: 'music', emoji: '🎶', label: 'Music corner', blurb: 'Records, speakers — maybe a piano' },
      { id: 'play', emoji: '🎮', label: 'Games corner', blurb: 'Foosball and fun lighting' },
      { id: 'party', emoji: '🎉', label: 'Party ready', blurb: 'Balloons, bunting and cake' },
      { id: 'surprise', emoji: '🎲', label: 'Surprise me', blurb: 'The assistant picks one' },
    ],
  },
];

// ---------------------------------------------------------------- generator

const WALL_GAP = 0.035;

type Rand = () => number;
const pick = <T>(r: Rand, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const jit = (r: Rand, amt: number): number => (r() * 2 - 1) * amt;

/** Doors that suit each style recipe. */
const STYLE_DOOR: Record<string, string> = {
  scandi: 'modern-door',
  cottage: 'door',
  retro: 'door',
  minimal: 'modern-door',
  academia: 'arched-door',
};

const PURPOSE_NAMES: Record<AssistantAnswers['purpose'], string[]> = {
  living: ['Living Room', 'Lounge', 'Den'],
  bedroom: ['Bedroom', 'Sleep Nook', 'Hideaway'],
  kitchen: ['Kitchen', 'Café', 'Little Bistro'],
  office: ['Office', 'Workshop', 'HQ'],
  kids: ['Playroom', 'Kids’ Room', 'Toy Land'],
  studio: ['Studio', 'Little Flat', 'Everything Room'],
};

/**
 * Half-footprint (x/z extents) of a catalog item, measured once per def by
 * building its model. The throwaway models are never rendered, so plain GC
 * reclaims them — no GPU resources are ever allocated.
 */
const FOOTPRINTS = new Map<string, { hw: number; hd: number }>();
function footprint(id: string): { hw: number; hd: number } {
  const cached = FOOTPRINTS.get(id);
  if (cached) return cached;
  const def = getDef(id);
  let fp = { hw: 0.3, hd: 0.3 };
  if (def) {
    const box = new THREE.Box3().setFromObject(def.make(def.colors[0] ?? '#ffffff'));
    fp = { hw: (box.max.x - box.min.x) / 2, hd: (box.max.z - box.min.z) / 2 };
  }
  FOOTPRINTS.set(id, fp);
  return fp;
}

/** Candidate nudges tried, in order, when a spot is already taken. */
const NUDGES: Array<[number, number]> = [
  [0, 0], [0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4],
  [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7],
  [0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6],
  [1.1, 0], [-1.1, 0],
];

interface Spot { x: number; z: number }

/** Assembles the item list; positions are clamped into the floor plan. */
class Plan {
  items: SavedItem[] = [];
  /** Placed surface items — accents can be dropped onto them later. */
  surfaces: Spot[] = [];
  private rects: Rect[];
  private solids: Array<{ x: number; z: number; hw: number; hd: number }> = [];
  private paletteIdx = 0;

  constructor(
    readonly w: number,
    readonly d: number,
    readonly shape: RoomShape,
    readonly style: StyleRecipe,
    readonly rand: Rand
  ) {
    const cfg: RoomConfig = {
      w, d, shape,
      wallStyle: style.wallStyle, wallColor: style.wallColor,
      floorStyle: style.floorStyle, floorColor: style.floorColor,
    };
    this.rects = roomRects(cfg);
  }

  get xL(): number { return -this.w / 2; }
  get xR(): number { return this.w / 2; }
  get zB(): number { return -this.d / 2; }
  get zF(): number { return this.d / 2; }

  private nextPalette(): string {
    return this.style.palette[this.paletteIdx++ % this.style.palette.length];
  }

  /** Fits (x, z) into whichever floor rect needs the smallest correction. */
  private clampToFloor(x: number, z: number, hw: number, hd: number): Spot {
    let best: Spot = { x, z };
    let bestD = Infinity;
    for (const r of this.rects) {
      const xlo = r.x0 + hw + 0.06, xhi = r.x1 - hw - 0.06;
      const zlo = r.z0 + hd + 0.06, zhi = r.z1 - hd - 0.06;
      const cx = xlo > xhi ? (r.x0 + r.x1) / 2 : Math.max(xlo, Math.min(xhi, x));
      const cz = zlo > zhi ? (r.z0 + r.z1) / 2 : Math.max(zlo, Math.min(zhi, z));
      const d2 = (cx - x) ** 2 + (cz - z) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = { x: cx, z: cz };
      }
    }
    return best;
  }

  private collides(x: number, z: number, hw: number, hd: number): boolean {
    return this.solids.some(
      (s) => Math.abs(x - s.x) < hw + s.hw - 0.05 && Math.abs(z - s.z) < hd + s.hd - 0.05
    );
  }

  /**
   * Floor item near (x, z); y settles on load (floor or a supporting surface).
   * Solid items dodge whatever is already placed — nudged if the spot is
   * taken, dropped entirely if nothing nearby fits. Returns where it landed.
   */
  put(id: string, x: number, z: number, rot = 0, opts?: { tint?: boolean; color?: string }): Spot | null {
    const def = getDef(id);
    if (!def) return null;
    const fp = footprint(id);
    // Rotated axis-aligned extents.
    const c = Math.abs(Math.cos(rot));
    const s = Math.abs(Math.sin(rot));
    const hw = fp.hw * c + fp.hd * s;
    const hd = fp.hw * s + fp.hd * c;
    const loose = def.rug || def.stackable || def.wall;
    let spot: Spot | null = null;
    for (const [dx, dz] of NUDGES) {
      const cand = this.clampToFloor(x + dx, z + dz, hw, hd);
      if (loose || !this.collides(cand.x, cand.z, hw, hd)) {
        spot = cand;
        break;
      }
    }
    if (!spot) return null;
    const color = opts?.color ?? (opts?.tint && def.colors.length ? this.nextPalette() : pick(this.rand, def.colors));
    this.items.push({ def: id, pos: [spot.x, 0, spot.z], rot, scale: 1, color });
    if (def.surface) this.surfaces.push(spot);
    if (!loose) this.solids.push({ x: spot.x, z: spot.z, hw, hd });
    return spot;
  }

  /** The exterior wall runs on one side of the plan (L/T/U walls are partial). */
  private wallSpans(side: 'back' | 'front' | 'left' | 'right'): Array<[number, number]> {
    const eps = 0.01;
    const spans: Array<[number, number]> = [];
    for (const r of this.rects) {
      if (side === 'back' && Math.abs(r.z0 - this.zB) < eps) spans.push([r.x0, r.x1]);
      if (side === 'front' && Math.abs(r.z1 - this.zF) < eps) spans.push([r.x0, r.x1]);
      if (side === 'left' && Math.abs(r.x0 - this.xL) < eps) spans.push([r.z0, r.z1]);
      if (side === 'right' && Math.abs(r.x1 - this.xR) < eps) spans.push([r.z0, r.z1]);
    }
    return spans;
  }

  /** Wall item on one of the four sides; t runs along the wall from its center. */
  wall(id: string, side: 'back' | 'front' | 'left' | 'right', t: number, y: number, opts?: { tint?: boolean }): void {
    const def = getDef(id);
    if (!def) return;
    // Snap t into the nearest stretch of wall that actually exists on this side.
    let tt = t;
    let bestD = Infinity;
    for (const [lo, hi] of this.wallSpans(side)) {
      const c = hi - lo < 1.7 ? (lo + hi) / 2 : Math.max(lo + 0.85, Math.min(hi - 0.85, t));
      if (Math.abs(c - t) < bestD) {
        bestD = Math.abs(c - t);
        tt = c;
      }
    }
    let pos: [number, number, number];
    let rot: number;
    switch (side) {
      case 'back': pos = [tt, y, this.zB + WALL_GAP]; rot = 0; break;
      case 'front': pos = [tt, y, this.zF - WALL_GAP]; rot = Math.PI; break;
      case 'left': pos = [this.xL + WALL_GAP, y, tt]; rot = Math.PI / 2; break;
      case 'right': pos = [this.xR - WALL_GAP, y, tt]; rot = -Math.PI / 2; break;
    }
    const color = opts?.tint && def.colors.length
      ? this.style.palette[Math.floor(this.rand() * this.style.palette.length)]
      : pick(this.rand, def.colors);
    this.items.push({ def: id, pos, rot, scale: 1, color });
  }
}

// ------------------------------------------------------------ purpose kits

function livingKit(p: Plan, r: Rand): void {
  const cx = jit(r, 0.4);
  const sofaKind = pick(r, ['sofa', 'sofa', 'corner-sofa', 'orange-sofa', 'lounge-set'] as const);
  p.put(pick(r, ['rect-rug', 'round-rug'] as const), cx, p.zB + 2.6, 0, { tint: true });
  const sofa = p.put(sofaKind, cx, p.zB + 1.1, 0, { tint: true });
  const ct = p.put('coffee-table', sofa?.x ?? cx, p.zB + 2.5);
  if (ct) {
    p.put('books', ct.x - 0.28, ct.z - 0.05);
    p.put(pick(r, ['vase', 'candles'] as const), ct.x + 0.3, ct.z + 0.05);
  }
  const st = p.put('side-table', cx + 2.1, p.zB + 0.8);
  if (st) p.put('table-lamp', st.x, st.z);
  p.put('floor-lamp', cx - 2.0, p.zB + 0.7);
  if (p.w >= 8) p.put('armchair', cx - 2.7, p.zB + 2.6, 0.7 + jit(r, 0.2), { tint: true });
  if (p.d >= 6.5) {
    const hifi = p.put('hifi', cx, p.zF - 0.8, Math.PI);
    if (hifi) p.put(pick(r, ['tv', 'tv', 'crt-tv'] as const), hifi.x, hifi.z);
  }
  p.put(pick(r, ['bookshelf', 'billy', 'low-bookcase'] as const), p.xL + 0.45, p.zB + p.d * 0.4, Math.PI / 2);
  p.put('plant', p.xR - 0.7, p.zB + 0.7);
  p.wall(pick(r, ['frame', 'frame-trio'] as const), 'back', cx, 2.0);
  p.wall('clock', 'back', cx - 2.2, 2.2);
  p.wall('window', 'left', -p.d * 0.1, 1.75);
}

function bedroomKit(p: Plan, r: Rand): void {
  const bx = p.xL + p.w * 0.3;
  const bedKind = pick(r, ['bed', 'bed', 'canopy-bed'] as const);
  const bed = p.put(bedKind, bx, p.zB + 1.35, 0, { tint: true });
  const nl = p.put('nightstand', (bed?.x ?? bx) - 1.4, p.zB + 0.55);
  if (nl) p.put('table-lamp', nl.x, nl.z);
  const nr = p.put('nightstand', (bed?.x ?? bx) + 1.4, p.zB + 0.55);
  if (nr) p.put('books', nr.x, nr.z);
  p.put('wardrobe', p.xR - 0.62, p.zB + 1.3, -Math.PI / 2);
  if (p.d >= 6.5) p.put('dresser', p.xR - 0.62, p.zB + 3.3, -Math.PI / 2);
  p.put('round-rug', bx + 0.4, p.zB + 3.3, 0, { tint: true });
  p.put('standing-mirror', p.xR - 0.85, p.zF - 1.0, -2.4);
  p.put('basket', bx + 2.2, p.zB + 0.6);
  p.put('plant', p.xL + 0.7, p.zF - 0.9);
  p.wall('frame-trio', 'back', bx, 2.15);
  p.wall('window', 'left', p.d * 0.05, 1.75);
  if (r() < 0.5) p.wall('fairy-lights', 'back', bx + 2.4, 2.3);
}

function kitchenKit(p: Plan, r: Rand): void {
  // A counter run along the back wall: fridge, counter, stove, sink, counter/oven.
  const zC = p.zB + 0.42;
  p.put(pick(r, ['fridge', 'tall-fridge', 'tall-fridge'] as const), p.xL + 0.62, zC + 0.12, 0, { tint: true });
  const c1 = p.put('kitchen-counter', p.xL + 1.85, zC, 0, { tint: true });
  if (c1) {
    p.put('kettle', c1.x - 0.3, c1.z);
    p.put(pick(r, ['rice-cooker', 'air-fryer'] as const), c1.x + 0.32, c1.z);
  }
  const st = p.put(pick(r, ['stove', 'induction-stove'] as const), p.xL + 2.95, zC, 0, { tint: true });
  if (st) {
    p.put(pick(r, ['cooking-pot', 'frying-pan'] as const), st.x + 0.06, st.z - 0.06);
    p.wall('range-hood', 'back', st.x, 1.72);
  }
  const sk = p.put('kitchen-sink', p.xL + 3.95, zC, 0, { tint: true });
  if (sk) p.put('mugs', sk.x + 0.36, sk.z + 0.1);
  if (p.w >= 8) {
    const end = p.put(pick(r, ['kitchen-counter', 'oven'] as const), p.xL + 5.15, zC, 0, { tint: true });
    if (end) p.put(pick(r, ['microwave', 'cereal-boxes'] as const), end.x, end.z);
  }
  if (p.w >= 9.5) p.put('mini-fridge', p.xL + 6.2, zC + 0.05, 0, { tint: true });
  p.wall('kitchen-cabinet', 'back', p.xL + 1.85, 2.05, { tint: true });
  p.wall('kitchen-cabinet', 'back', (sk?.x ?? p.xL + 3.95), 2.05, { tint: true });
  p.wall('wall-shelf', 'back', p.xL + 5.3, 2.0);
  // An island with stools when there's room to walk around it.
  const island = p.w >= 8.5 && p.d >= 6.5
    ? p.put('kitchen-island', p.xL + 3.1, p.zB + 2.2, 0, { tint: true })
    : null;
  if (island) {
    p.put(pick(r, ['pizza-oven', 'mugs', 'frying-pan'] as const), island.x - 0.4, island.z - 0.05);
    p.put('bar-stool', island.x - 0.4, island.z + 0.8, 0, { tint: true });
    p.put('bar-stool', island.x + 0.4, island.z + 0.8, 0, { tint: true });
  }
  // Dining corner, pushed toward the front when the island takes the middle.
  const tx = (island ? p.xL + p.w * 0.68 : 0.8) + jit(r, 0.4);
  const tz = island ? Math.min(p.zB + 4.2, p.zF - 1.5) : p.zB + 3.4;
  p.put('round-rug', tx, tz, 0, { tint: true });
  const dt = p.put('dining-table', tx, tz);
  if (dt) {
    p.put('vase', dt.x, dt.z);
    p.put('chair', dt.x, dt.z - 0.85);
    p.put('chair', dt.x, dt.z + 0.85, Math.PI);
    if (p.w >= 8) p.put('chair', dt.x - 1.05, dt.z, Math.PI / 2);
  }
  p.put('plant', p.xR - 0.7, p.zB + 0.7);
  p.put('basket', p.xR - 0.7, p.zF - 2.4);
  p.wall('menu-board', 'left', -p.d * 0.05, 1.8);
  p.wall('window', 'right', -p.d * 0.1, 1.75);
  p.wall('clock', 'back', p.xR - 1.2, 2.25);
}

function officeKit(p: Plan, r: Rand): void {
  const dx = jit(r, 0.5);
  const desk = p.put(pick(r, ['desk', 'standing-desk'] as const), dx, p.zB + 0.6);
  if (desk) {
    p.put(pick(r, ['monitor', 'ultrawide'] as const), desk.x - 0.05, desk.z - 0.05);
    p.put('keyboard', desk.x, desk.z + 0.18);
    if (r() < 0.5) p.put('laptop', desk.x + 0.55, desk.z);
    p.put(pick(r, ['desk-chair', 'ergo-chair'] as const), desk.x, desk.z + 1.0, Math.PI);
  }
  p.put('rolling-drawers', dx + 1.3, p.zB + 0.6);
  const fc = p.put('filing-cabinet', p.xL + 0.55, p.zB + 0.55);
  if (fc) p.put('printer', fc.x, fc.z);
  p.put(pick(r, ['billy', 'billy-oxberg', 'bookshelf'] as const), p.xL + 0.45, p.zB + p.d * 0.45, Math.PI / 2);
  p.put('speakers', dx - 1.5, p.zB + 0.6);
  p.put('air-purifier', p.xR - 0.6, p.zB + 0.7);
  p.put('plant', p.xR - 0.7, p.zF - 0.9);
  p.put('rect-rug', dx, p.zB + 2.3, 0, { tint: true });
  p.wall('wall-shelf', 'back', dx + 1.8, 2.0);
  p.wall('clock', 'back', dx - 2.0, 2.2);
  p.wall('window', 'right', -p.d * 0.1, 1.75);
}

function kidsKit(p: Plan, r: Rand): void {
  const bx = p.xL + p.w * 0.28;
  const bed = p.put('bed', bx, p.zB + 1.3, 0, { tint: true });
  const ns = p.put('nightstand', (bed?.x ?? bx) + 1.4, p.zB + 0.55);
  if (ns) p.put('paper-lantern', ns.x, ns.z);
  const tb = p.put('toybox', bx + 0.1, p.zB + 3.1, 0, { tint: true });
  if (tb) p.put('teddy', tb.x + 0.05, tb.z - 0.05);
  const lb = p.put('low-bookcase', p.xR - 1.6, p.zB + 0.5);
  if (lb) {
    p.put('train', lb.x - 0.25, lb.z - 0.05);
    p.put('dollhouse', lb.x + 0.3, lb.z);
  }
  const cs = p.put('cube-storage', p.xR - 0.62, p.zB + 2.6, -Math.PI / 2);
  if (cs) p.put('mushroom-pot', cs.x, cs.z);
  p.put('round-rug', 0.3, p.zB + 3.4, 0, { tint: true });
  p.put('cushion', 0.1, p.zB + 3.3, jit(r, 1), { tint: true });
  p.wall('bunting', 'back', bx, 2.45, { tint: true });
  p.wall('fairy-lights', 'back', bx + 2.6, 2.3);
  p.wall('frame', 'left', p.d * 0.2, 1.9);
  p.wall('window', 'left', -p.d * 0.15, 1.75);
}

function studioKit(p: Plan, r: Rand): void {
  p.put('bed', p.xL + 1.35, p.zB + 1.15, 0, { tint: true });
  const st = p.put('side-table', p.xL + 0.55, p.zB + 2.3, Math.PI / 2);
  if (st) p.put('table-lamp', st.x, st.z);
  const fr = p.put('fridge', p.xR - 0.65, p.zB + 0.65, -Math.PI / 2);
  if (fr) p.put('cereal-boxes', fr.x, fr.z);
  const dt = p.put('dining-table', p.xR - 1.9, p.zB + 2.0);
  if (dt) {
    p.put('chair', dt.x, dt.z - 0.8);
    p.put('chair', dt.x, dt.z + 0.8, Math.PI);
  }
  p.put(pick(r, ['rect-rug', 'round-rug'] as const), 0, p.zF - 1.8, 0, { tint: true });
  p.put('armchair', -0.6 + jit(r, 0.3), p.zF - 1.2, Math.PI + jit(r, 0.4), { tint: true });
  const ct = p.put('coffee-table', 0.2, p.zF - 2.1);
  if (ct) p.put('books', ct.x - 0.05, ct.z + 0.05);
  p.put('bookshelf', 0.4, p.zB + 0.45);
  p.put('floor-lamp', p.xL + 0.6, p.zF - 0.7);
  p.put('plant', p.xR - 0.7, p.zF - 0.8);
  p.wall('window', 'left', -p.d * 0.1, 1.75);
  p.wall('window', 'back', p.w * 0.1, 1.75);
  p.wall('clock', 'back', -1.2, 2.2);
  p.wall('wall-shelf', 'right', p.d * 0.15, 2.0);
}

const PURPOSE_KITS: Record<AssistantAnswers['purpose'], (p: Plan, r: Rand) => void> = {
  living: livingKit,
  bedroom: bedroomKit,
  kitchen: kitchenKit,
  office: officeKit,
  kids: kidsKit,
  studio: studioKit,
};

// ------------------------------------------------------------ touch kits

function touchKit(p: Plan, r: Rand, touch: AssistantAnswers['touch']): void {
  const kind = touch === 'surprise'
    ? pick(r, ['plants', 'books', 'music', 'play', 'party'] as const)
    : touch;
  // The front-left corner is the anchor: kits keep clear of the purpose kit,
  // and in L-shaped rooms this is the alcove.
  const cx = p.xL + 1.0;
  const cz = p.zF - 1.0;
  switch (kind) {
    case 'plants':
      p.put('plant', cx, cz);
      p.put('fern', cx + 0.8, cz + 0.1);
      p.put('small-plant', cx + 0.4, cz - 0.7);
      p.put('mushroom-pot', cx + 1.1, cz - 0.5);
      break;
    case 'books': {
      const lb = p.put('low-bookcase', cx + 0.4, cz, Math.PI);
      if (lb) {
        p.put('books', lb.x - 0.2, lb.z + 0.05);
        p.put('books', lb.x + 0.3, lb.z - 0.02);
      }
      p.put('armchair', cx + 1.7, cz - 0.7, 2.5 + jit(r, 0.3), { tint: true });
      p.put('floor-lamp', cx, cz - 1.1);
      break;
    }
    case 'music': {
      const st = p.put('side-table', cx + 0.3, cz);
      if (st) p.put('record-player', st.x, st.z);
      p.put('speakers', cx + 1.2, cz + 0.05);
      if (p.w >= 9) p.put('piano', cx + 2.6, cz - 0.9, 0.7 + jit(r, 0.25));
      break;
    }
    case 'play':
      if (p.w >= 8) p.put('foosball', cx + 1.3, cz - 0.5, 0.4 + jit(r, 0.3));
      else p.put('train', cx + 0.5, cz - 0.3, jit(r, 1));
      p.put('lava-lamp', cx + 0.1, cz + 0.1);
      break;
    case 'party': {
      p.wall('bunting', 'front', 0, 2.45, { tint: true });
      p.put('balloons', cx, cz - 0.3);
      p.put('balloons', p.xR - 0.8, p.zF - 0.9);
      p.put('gifts', cx + 0.7, cz + 0.1);
      const s = p.surfaces.length ? pick(r, p.surfaces) : null;
      if (s) p.put('cake', s.x + jit(r, 0.1), s.z + jit(r, 0.1));
      break;
    }
  }
}

// ------------------------------------------------------------ accents

const ACCENTS = [
  'books', 'vase', 'candles', 'mantel-clock', 'globe', 'snow-globe',
  'camera', 'radio', 'music-box', 'small-plant', 'fern',
];

/** Kitchens collect cookware, not globes and cameras. */
const KITCHEN_ACCENTS = [
  'mugs', 'frying-pan', 'cooking-pot', 'kettle', 'rice-cooker', 'air-fryer',
  'microwave', 'cereal-boxes', 'vase', 'candles', 'small-plant', 'radio',
];

function accentPass(p: Plan, r: Rand, a: AssistantAnswers): void {
  const tidiness = a.tidiness;
  if (tidiness === 'tidy' || p.surfaces.length === 0) return;
  const pool = a.purpose === 'kitchen' ? KITCHEN_ACCENTS : ACCENTS;
  const n = tidiness === 'collector' ? 5 + Math.floor(r() * 3) : 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const s = pick(r, p.surfaces);
    p.put(pick(r, pool), s.x + jit(r, 0.18), s.z + jit(r, 0.18), jit(r, 0.5));
  }
  if (tidiness === 'collector') {
    p.put('basket', p.xR - 0.6, p.zF - 2.2 - r());
    p.put('cushion', jit(r, 1), p.zF - 1.4, jit(r, 1.5), { tint: true });
  }
}

// ------------------------------------------------------------ entry point

const SIZES: Record<AssistantAnswers['size'], { w: [number, number]; d: [number, number] }> = {
  cozy: { w: [6.5, 7.5], d: [5, 6] },
  comfy: { w: [8.5, 10], d: [6.5, 8] },
  grand: { w: [11, 14], d: [8.5, 11] },
};

const half = (r: Rand, [lo, hi]: [number, number]): number => Math.round((lo + r() * (hi - lo)) * 2) / 2;

export function generateRoom(a: AssistantAnswers, rand: Rand = Math.random): SavedRoom {
  const style = STYLE_RECIPES.find((s) => s.id === a.style) ?? STYLE_RECIPES[0];
  const w = half(rand, SIZES[a.size].w);
  const d = half(rand, SIZES[a.size].d);
  // Grand rooms sometimes come as an L: the front-left alcove hosts the touch kit.
  const shape: RoomShape = a.size === 'grand' && rand() < 0.5 ? 'l' : 'rect';
  const p = new Plan(w, d, shape, style, rand);

  PURPOSE_KITS[a.purpose](p, rand);
  touchKit(p, rand, a.touch);
  // Grand rooms earn a second window and a warm far corner so they don't echo.
  if (a.size === 'grand') {
    p.wall('window', 'left', d * 0.25, 1.75);
    p.put('plant', p.xR - 0.8, p.zF - 2.8);
    p.put('floor-lamp', p.xR - 1.4, p.zF - 0.8);
  }
  accentPass(p, rand, a);
  p.wall(STYLE_DOOR[style.id] ?? 'door', 'front', w / 2 - 1.4, 0);

  return {
    version: 1,
    mood: style.mood,
    title: `${style.name} ${pick(rand, PURPOSE_NAMES[a.purpose])}`.slice(0, 40),
    room: {
      w,
      d,
      shape,
      wallStyle: style.wallStyle,
      wallColor: style.wallColor,
      floorStyle: style.floorStyle,
      floorColor: style.floorColor,
    },
    items: p.items,
  };
}
