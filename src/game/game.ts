import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CATALOG, getDef, type ItemDef } from '../assets/catalog';
import {
  buildRoomShell, roomRects, roomWalls, DEFAULT_ROOM, ROOM_H, ROOM_SHAPES,
  type RoomConfig, type RoomShape, type Rect, type WallSeg,
} from './room';
import { loadRoom, saveRoom, clearSaved, type SavedItem } from './state';
import { audio } from '../core/audio';

export interface PlacedItem {
  uid: number;
  def: ItemDef;
  group: THREE.Group;
  color: string;
  /** Local-space bounding box at scale 1, cached on build. */
  bbox: THREE.Box3;
}

export type MoodName = 'day' | 'sunset' | 'night';
export type GameMode = 'edit' | 'walk';

interface Mood {
  bg: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  ambient: number;
  skyBrightness: number;
}

const MOODS: Record<MoodName, Mood> = {
  day: { bg: '#dfd7c6', hemiSky: '#cfe4ef', hemiGround: '#b09678', hemiIntensity: 1.0, sunColor: '#fff2dc', sunIntensity: 2.6, ambient: 0.35, skyBrightness: 1 },
  sunset: { bg: '#d8c2ac', hemiSky: '#f2c9a0', hemiGround: '#8f6a52', hemiIntensity: 0.8, sunColor: '#ffb56b', sunIntensity: 2.2, ambient: 0.28, skyBrightness: 0.8 },
  night: { bg: '#20232e', hemiSky: '#3a4460', hemiGround: '#2a2320', hemiIntensity: 0.5, sunColor: '#8ea2cc', sunIntensity: 0.7, ambient: 0.16, skyBrightness: 0.22 },
};

interface Tween {
  t: number;
  dur: number;
  step: (k: number) => void;
  done?: () => void;
}

const WALL_GAP = 0.035;

export class RoomGame {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly items: PlacedItem[] = [];
  selected: PlacedItem | null = null;

  onSelectionChange: (item: PlacedItem | null) => void = () => {};
  onItemsChange: (count: number) => void = () => {};
  onHint: (text: string) => void = () => {};
  onModeChange: (mode: GameMode) => void = () => {};
  onToast: (text: string) => void = () => {};
  /** Joystick feedback for the touch UI: origin + thumb offset, or null when released. */
  onJoystick: (state: { x: number; y: number; dx: number; dy: number } | null) => void = () => {};

  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private mood: MoodName = 'day';
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragging: PlacedItem | null = null;
  private dragPointerId: number | null = null;
  private dragMoved = false;
  private grabOffset = new THREE.Vector3();
  private riders: Array<{ item: PlacedItem; dx: number; dz: number }> = [];
  private floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ring: THREE.Mesh;
  private tweens: Tween[] = [];
  private uidCounter = 1;
  private saveTimer: number | undefined;
  private clock = new THREE.Clock();
  private mode: GameMode = 'edit';
  private walkYaw = 0;
  private walkPitch = 0;
  private walkKeys = new Set<string>();
  private walkBob = 0;
  private walkBlockers: Array<{ x: number; z: number; hw: number; hd: number }> = [];
  private lookPointer: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private lookMoved = 0;
  private movePointer: number | null = null;
  private moveOrigin = { x: 0, y: 0 };
  private moveVec = { x: 0, y: 0 };
  private savedCam: { pos: THREE.Vector3; target: THREE.Vector3; fov: number } | null = null;
  private roomCfg: RoomConfig = { ...DEFAULT_ROOM };
  private rects: Rect[] = [];
  private wallSegs: WallSeg[] = [];
  private roomGroup: THREE.Group | null = null;
  private highlighted: Array<{ mat: THREE.MeshStandardMaterial; emissive: THREE.Color; intensity: number }> = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60);
    this.camera.position.set(6.4, 5.2, 7.6);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0.2, 0.9, -0.2);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = 1.42;
    this.controls.minPolarAngle = 0.25;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 16;
    this.controls.enablePan = false;

    this.hemi = new THREE.HemisphereLight('#cfe4ef', '#b09678', 1.0);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight('#ffffff', 0.35);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#fff2dc', 2.6);
    this.sun.position.set(-4.5, 6.5, 3.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -7;
    this.sun.shadow.camera.right = 7;
    this.sun.shadow.camera.top = 7;
    this.sun.shadow.camera.bottom = -7;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);

    const ringGeo = new THREE.RingGeometry(0.5, 0.62, 40);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: '#ffb45e', transparent: true, opacity: 0.85, depthWrite: false })
    );
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    this.scene.add(this.ring);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onWalkKey);
    window.addEventListener('keyup', this.onWalkKey);
    window.addEventListener('blur', () => this.walkKeys.clear());
    window.addEventListener('resize', this.resize);
    this.resize();

    this.restore();
    this.exposeDiagnostics();
    this.renderer.setAnimationLoop(this.frame);
  }

  // ------------------------------------------------------------- lifecycle

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private frame = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.mode === 'walk') this.updateWalk(dt);
    else this.controls.update();

    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(tw.t / tw.dur, 1);
      tw.step(k);
      if (k >= 1) {
        tw.done?.();
        this.tweens.splice(i, 1);
      }
    }

    if (this.selected && !this.selected.def.wall) {
      this.ring.visible = true;
      const p = this.selected.group.position;
      const { cx, cz } = this.footprintHalf(this.selected);
      this.ring.position.set(p.x + cx, 0.02, p.z + cz);
      const radius = this.footprintRadius(this.selected) + 0.12;
      this.ring.scale.setScalar(radius / 0.56);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(performance.now() * 0.005) * 0.25;
    } else {
      this.ring.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private exposeDiagnostics(): void {
    Object.defineProperty(window, '__THREE_GAME_DIAGNOSTICS__', {
      configurable: true,
      get: () => ({
        items: this.items.length,
        selected: this.selected?.def.id ?? null,
        mood: this.mood,
        render: { ...this.renderer.info.render },
        memory: { ...this.renderer.info.memory },
      }),
    });
  }

  // ------------------------------------------------------------- room shape

  getRoomConfig(): RoomConfig {
    return { ...this.roomCfg };
  }

  setRoomConfig(cfg: RoomConfig): void {
    this.applyRoom(cfg);
    for (const item of this.items) {
      if (item.def.wall) {
        this.snapWallItem(item);
      } else {
        this.clampToRoom(item);
        this.settleVertical(item);
      }
    }
    this.scheduleSave();
  }

  private applyRoom(cfg: RoomConfig): void {
    this.roomCfg = { ...cfg };
    if (this.roomGroup) {
      this.scene.remove(this.roomGroup);
      this.roomGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          }
        }
      });
    }
    this.roomGroup = buildRoomShell(cfg);
    this.scene.add(this.roomGroup);
    this.rects = roomRects(cfg);
    this.wallSegs = roomWalls(this.rects);
    const b = Math.max(cfg.w, cfg.d) * 0.8;
    this.sun.shadow.camera.left = -b;
    this.sun.shadow.camera.right = b;
    this.sun.shadow.camera.top = b;
    this.sun.shadow.camera.bottom = -b;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.controls.maxDistance = Math.max(cfg.w, cfg.d) * 1.9;
  }

  /** Re-projects a wall item onto the nearest wall segment of the current shell. */
  private snapWallItem(item: PlacedItem): void {
    const hw = this.footprintRadius(item);
    const p = item.group.position;
    let best: { x: number; z: number; rotY: number } | null = null;
    let bestD = Infinity;
    for (const seg of this.wallSegs) {
      if (seg.len < hw * 2 + 0.15) continue;
      const alongX = seg.nz !== 0;
      const t = THREE.MathUtils.clamp(
        alongX ? p.x - seg.cx : p.z - seg.cz,
        -(seg.len / 2 - hw - 0.05),
        seg.len / 2 - hw - 0.05
      );
      const x = alongX ? seg.cx + t : seg.cx + seg.nx * WALL_GAP;
      const z = alongX ? seg.cz + seg.nz * WALL_GAP : seg.cz + t;
      const d2 = (x - p.x) ** 2 + (z - p.z) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = { x, z, rotY: Math.atan2(seg.nx, seg.nz) };
      }
    }
    if (best) {
      p.x = best.x;
      p.z = best.z;
      item.group.rotation.y = best.rotY;
      p.y = this.wallItemY(item, p.y);
    }
  }

  // ------------------------------------------------------------- items

  private buildItem(def: ItemDef, color: string): PlacedItem {
    const group = def.make(color);
    const bbox = new THREE.Box3().setFromObject(group);
    const item: PlacedItem = { uid: this.uidCounter++, def, group, color, bbox };
    group.userData.item = item;
    this.scene.add(group);
    this.items.push(item);
    return item;
  }

  addItem(defId: string): void {
    const def = getDef(defId);
    if (!def) return;
    const item = this.buildItem(def, def.colors[0]);
    if (def.wall) {
      const spot = this.findWallSpot(item);
      item.group.position.copy(spot.pos);
      item.group.rotation.y = spot.rotY;
    } else {
      const spot = this.findFloorSpot(item);
      item.group.position.set(spot.x, 0, spot.z);
      this.clampToRoom(item);
    }
    this.select(item);
    this.popIn(item);
    audio.place();
    this.onItemsChange(this.items.length);
    this.scheduleSave();
    this.onHint(def.wall ? 'Drag along the walls to reposition.' : 'Drag to move · Q/E rotate · Del removes');
  }

  removeSelected(): void {
    const item = this.selected;
    if (!item) return;
    this.select(null);
    const idx = this.items.indexOf(item);
    if (idx >= 0) this.items.splice(idx, 1);
    const start = item.group.scale.clone();
    this.tweens.push({
      t: 0,
      dur: 0.18,
      step: (k) => {
        const v = Math.max(0.001, 1 - k);
        item.group.scale.set(start.x * v, start.y * v, start.z * v);
      },
      done: () => {
        this.scene.remove(item.group);
        disposeGroup(item.group);
      },
    });
    audio.remove();
    this.onItemsChange(this.items.length);
    this.scheduleSave();
  }

  duplicateSelected(): void {
    const src = this.selected;
    if (!src) return;
    const copy = this.buildItem(src.def, src.color);
    copy.group.rotation.y = src.group.rotation.y;
    copy.group.scale.copy(src.group.scale);
    if (src.def.wall) {
      const spot = this.findWallSpot(copy);
      copy.group.position.copy(spot.pos);
      copy.group.rotation.y = spot.rotY;
    } else {
      const spot = this.findFloorSpot(copy, src.group.position.x, src.group.position.z);
      copy.group.position.set(spot.x, src.group.position.y, spot.z);
      this.settleVertical(copy);
    }
    this.select(copy);
    this.popIn(copy);
    audio.place();
    this.onItemsChange(this.items.length);
    this.scheduleSave();
  }

  rotateSelected(dir: 1 | -1): void {
    const item = this.selected;
    if (!item || item.def.wall) return;
    item.group.rotation.y += dir * (Math.PI / 12);
    this.clampToRoom(item);
    audio.click();
    this.scheduleSave();
  }

  scaleSelected(scale: number): void {
    const item = this.selected;
    if (!item) return;
    const s = THREE.MathUtils.clamp(scale, 0.6, 1.5);
    const sign = item.group.scale.x < 0 ? -1 : 1;
    item.group.scale.set(s * sign, s, s);
    if (!item.def.wall) {
      this.clampToRoom(item);
      this.settleVertical(item);
    } else {
      item.group.position.y = this.wallItemY(item, item.group.position.y);
    }
    this.scheduleSave();
  }

  /** Mirrors the item across its local left/right axis (door handles, chaises…). */
  flipSelected(): void {
    const item = this.selected;
    if (!item) return;
    item.group.scale.x *= -1;
    if (!item.def.wall) {
      this.clampToRoom(item);
      this.settleVertical(item);
    }
    audio.click();
    this.scheduleSave();
  }

  recolorSelected(color: string, silent = false): void {
    const item = this.selected;
    if (!item) return;
    item.color = color;
    item.group.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        const mat = c.material as THREE.MeshStandardMaterial;
        if (mat.userData?.tint) mat.color.set(color);
      }
    });
    if (!silent) audio.click();
    this.scheduleSave();
  }

  clearRoom(): void {
    this.select(null);
    for (const item of this.items) {
      this.scene.remove(item.group);
      disposeGroup(item.group);
    }
    this.items.length = 0;
    clearSaved();
    this.onItemsChange(0);
  }

  select(item: PlacedItem | null): void {
    if (this.selected === item) return;
    for (const h of this.highlighted) {
      h.mat.emissive.copy(h.emissive);
      h.mat.emissiveIntensity = h.intensity;
    }
    this.highlighted = [];
    this.selected = item;
    if (item) {
      const seen = new Set<THREE.MeshStandardMaterial>();
      item.group.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          const mat = c.material as THREE.MeshStandardMaterial;
          if (mat.isMeshStandardMaterial && !seen.has(mat)) {
            seen.add(mat);
            this.highlighted.push({ mat, emissive: mat.emissive.clone(), intensity: mat.emissiveIntensity });
            mat.emissive.lerp(new THREE.Color('#ff9a3c'), 0.13);
          }
        }
      });
      audio.select();
    }
    this.onSelectionChange(item);
  }

  // ------------------------------------------------------------- placement

  /**
   * World-space footprint of an item: half extents plus the offset of the
   * footprint's center from the group origin (nonzero for asymmetric models
   * like the corner sofa), both accounting for rotation and scale.
   */
  private footprintHalf(item: PlacedItem): { hw: number; hd: number; cx: number; cz: number } {
    // scale.x is signed (negative when the item is mirrored): extents use the
    // magnitude, while the center offset keeps the sign so it mirrors too.
    const sx = item.group.scale.x;
    const s = Math.abs(sx);
    const hw0 = ((item.bbox.max.x - item.bbox.min.x) / 2) * s;
    const hd0 = ((item.bbox.max.z - item.bbox.min.z) / 2) * s;
    const cx0 = ((item.bbox.max.x + item.bbox.min.x) / 2) * sx;
    const cz0 = ((item.bbox.max.z + item.bbox.min.z) / 2) * s;
    const c = Math.cos(item.group.rotation.y);
    const sn = Math.sin(item.group.rotation.y);
    return {
      hw: hw0 * Math.abs(c) + hd0 * Math.abs(sn),
      hd: hw0 * Math.abs(sn) + hd0 * Math.abs(c),
      cx: cx0 * c + cz0 * sn,
      cz: -cx0 * sn + cz0 * c,
    };
  }

  private footprintRadius(item: PlacedItem): number {
    const { hw, hd } = this.footprintHalf(item);
    return Math.max(hw, hd);
  }

  private itemTop(item: PlacedItem): number {
    return item.group.position.y + (item.bbox.max.y - item.bbox.min.y) * item.group.scale.y;
  }

  /**
   * Keeps an item's footprint inside the floor plan. The footprint is fitted
   * into whichever rect of the union needs the smallest correction, so items
   * follow the pointer across rects but never straddle a boundary into a notch.
   */
  private clampToRoom(item: PlacedItem): void {
    const { hw, hd, cx, cz } = this.footprintHalf(item);
    const p = item.group.position;
    const wx = p.x + cx;
    const wz = p.z + cz;
    let best = { x: wx, z: wz };
    let bestD = Infinity;
    for (const r of this.rects) {
      const xlo = r.x0 + hw + 0.02, xhi = r.x1 - hw - 0.02;
      const zlo = r.z0 + hd + 0.02, zhi = r.z1 - hd - 0.02;
      const x = xlo > xhi ? (r.x0 + r.x1) / 2 : THREE.MathUtils.clamp(wx, xlo, xhi);
      const z = zlo > zhi ? (r.z0 + r.z1) / 2 : THREE.MathUtils.clamp(wz, zlo, zhi);
      const d2 = (x - wx) ** 2 + (z - wz) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = { x, z };
      }
    }
    p.x = best.x - cx;
    p.z = best.z - cz;
  }

  private fitsFloor(item: PlacedItem, x: number, z: number): boolean {
    const { hw, hd, cx, cz } = this.footprintHalf(item);
    const wx = x + cx;
    const wz = z + cz;
    return this.rects.some(
      (r) => wx - hw >= r.x0 + 0.02 && wx + hw <= r.x1 - 0.02 && wz - hd >= r.z0 + 0.02 && wz + hd <= r.z1 - 0.02
    );
  }

  /** Recompute the resting height of a floor item: floor, or the best supporting surface. */
  private settleVertical(item: PlacedItem): void {
    if (item.def.wall || item.def.rug) {
      if (item.def.rug) item.group.position.y = 0;
      return;
    }
    let y = 0;
    if (item.def.stackable) {
      const p = item.group.position;
      for (const other of this.items) {
        if (other === item || !other.def.surface) continue;
        const { hw, hd, cx, cz } = this.footprintHalf(other);
        const o = other.group.position;
        if (Math.abs(p.x - (o.x + cx)) <= hw && Math.abs(p.z - (o.z + cz)) <= hd) {
          y = Math.max(y, this.itemTop(other));
        }
      }
    }
    item.group.position.y = y;
  }

  private overlapsAny(item: PlacedItem, x: number, z: number): boolean {
    const a = this.footprintHalf(item);
    for (const other of this.items) {
      if (other === item || other.def.rug || other.def.wall) continue;
      const b = this.footprintHalf(other);
      const o = other.group.position;
      if (
        Math.abs(x + a.cx - (o.x + b.cx)) < a.hw + b.hw - 0.05 &&
        Math.abs(z + a.cz - (o.z + b.cz)) < a.hd + b.hd - 0.05
      ) return true;
    }
    return false;
  }

  private findFloorSpot(item: PlacedItem, cx = 0.4, cz = 0.4): { x: number; z: number } {
    const rings = Math.ceil(Math.max(this.roomCfg.w, this.roomCfg.d) / 0.45) + 2;
    for (const requireFree of [true, false]) {
      for (let ringIdx = 0; ringIdx < rings; ringIdx++) {
        const r = ringIdx * 0.45;
        const steps = ringIdx === 0 ? 1 : ringIdx * 8;
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const x = cx + Math.cos(a) * r;
          const z = cz + Math.sin(a) * r;
          if (!this.fitsFloor(item, x, z)) continue;
          if (requireFree && this.overlapsAny(item, x, z)) continue;
          return { x, z };
        }
      }
    }
    return { x: cx, z: cz };
  }

  private wallItemY(item: PlacedItem, desired: number): number {
    const s = item.group.scale.y;
    if (item.def.floorWall) return -item.bbox.min.y * s;
    const halfH = ((item.bbox.max.y - item.bbox.min.y) / 2) * s;
    return THREE.MathUtils.clamp(desired, 1.0, ROOM_H - halfH - 0.15);
  }

  private findWallSpot(item: PlacedItem): { pos: THREE.Vector3; rotY: number } {
    const y = this.wallItemY(item, 1.7);
    const hw = this.footprintRadius(item);
    const segs = [...this.wallSegs].sort((a, b) => b.len - a.len);
    for (const seg of segs) {
      if (seg.len < hw * 2 + 0.2) continue;
      const alongX = seg.nz !== 0;
      const rotY = Math.atan2(seg.nx, seg.nz);
      const slots = Math.max(1, Math.floor((seg.len - hw * 2 - 0.2) / 0.65) + 1);
      for (let i = 0; i < slots; i++) {
        const t = -(seg.len / 2 - hw - 0.1) + i * 0.65;
        const x = alongX ? seg.cx + t : seg.cx + seg.nx * WALL_GAP;
        const z = alongX ? seg.cz + seg.nz * WALL_GAP : seg.cz + t;
        const taken = this.items.some(
          (o) => o !== item && o.def.wall && Math.hypot(o.group.position.x - x, o.group.position.z - z) < 0.6
        );
        if (!taken) return { pos: new THREE.Vector3(x, y, z), rotY };
      }
    }
    const s0 = segs[0];
    return {
      pos: new THREE.Vector3(s0.cx + s0.nx * WALL_GAP, y, s0.cz + s0.nz * WALL_GAP),
      rotY: Math.atan2(s0.nx, s0.nz),
    };
  }

  // ------------------------------------------------------------- pointer

  private setPointer(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private itemAtPointer(): PlacedItem | null {
    const meshes: THREE.Object3D[] = this.items.map((i) => i.group);
    const hits = this.raycaster.intersectObjects(meshes, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData.item) return o.userData.item as PlacedItem;
        o = o.parent;
      }
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.mode === 'walk') {
      this.onWalkPointerDown(e);
      return;
    }
    if (this.dragging) return;
    this.setPointer(e);
    const item = this.itemAtPointer();
    if (item) {
      this.select(item);
      this.dragging = item;
      this.dragPointerId = e.pointerId;
      this.dragMoved = false;
      this.controls.enabled = false;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        // Capture can fail for synthetic events; dragging works without it.
      }
      this.riders = [];
      if (item.def.surface) {
        const top = this.itemTop(item);
        const { hw, hd } = this.footprintHalf(item);
        for (const other of this.items) {
          if (other === item || !other.def.stackable) continue;
          const o = other.group.position;
          if (Math.abs(o.y - top) < 0.04 && Math.abs(o.x - item.group.position.x) <= hw && Math.abs(o.z - item.group.position.z) <= hd) {
            this.riders.push({ item: other, dx: o.x - item.group.position.x, dz: o.z - item.group.position.z });
          }
        }
      }
      if (!item.def.wall) {
        const hit = new THREE.Vector3();
        this.floorPlane.constant = 0;
        if (this.raycaster.ray.intersectPlane(this.floorPlane, hit)) {
          this.grabOffset.set(hit.x - item.group.position.x, 0, hit.z - item.group.position.z);
        } else {
          this.grabOffset.set(0, 0, 0);
        }
      }
      audio.pickup();
    } else {
      this.select(null);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.mode === 'walk') {
      this.onWalkPointerMove(e);
      return;
    }
    if (!this.dragging || e.pointerId !== this.dragPointerId) return;
    this.setPointer(e);
    const item = this.dragging;
    this.dragMoved = true;

    if (item.def.wall) {
      this.dragWallItem(item);
    } else {
      // Stackable items track surfaces under the pointer directly, so dropping
      // something "onto a table" works the way it looks on screen.
      if (item.def.stackable) {
        const support = this.surfaceHitAtPointer(item);
        if (support) {
          item.group.position.set(support.point.x, this.itemTop(support.item), support.point.z);
          this.moveRiders(item);
          return;
        }
      }
      const hit = new THREE.Vector3();
      this.floorPlane.constant = 0;
      if (!this.raycaster.ray.intersectPlane(this.floorPlane, hit)) return;
      item.group.position.x = hit.x - this.grabOffset.x;
      item.group.position.z = hit.z - this.grabOffset.z;
      this.clampToRoom(item);
      this.settleVertical(item);
      this.moveRiders(item);
    }
  };

  private moveRiders(item: PlacedItem): void {
    if (this.riders.length === 0) return;
    const top = this.itemTop(item);
    for (const r of this.riders) {
      r.item.group.position.set(item.group.position.x + r.dx, top, item.group.position.z + r.dz);
    }
  }

  private surfaceHitAtPointer(exclude: PlacedItem): { item: PlacedItem; point: THREE.Vector3 } | null {
    const groups = this.items.filter((i) => i !== exclude && i.def.surface).map((i) => i.group);
    if (groups.length === 0) return null;
    const hits = this.raycaster.intersectObjects(groups, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData.item) return { item: o.userData.item as PlacedItem, point: hit.point };
        o = o.parent;
      }
    }
    return null;
  }

  private dragWallItem(item: PlacedItem): void {
    const ray = this.raycaster.ray;
    const halfW = this.footprintRadius(item);
    const normal = new THREE.Vector3();
    const hit = new THREE.Vector3();
    let best: { seg: WallSeg; hit: THREE.Vector3; dist: number } | null = null;
    for (const seg of this.wallSegs) {
      if (seg.len < halfW * 2 + 0.15) continue;
      normal.set(seg.nx, 0, seg.nz);
      // Only walls whose face points toward the camera can receive the drop.
      if (normal.dot(ray.direction) >= -0.05) continue;
      const plane = new THREE.Plane(normal.clone(), -(seg.nx * seg.cx + seg.nz * seg.cz));
      if (!ray.intersectPlane(plane, hit)) continue;
      const alongX = seg.nz !== 0;
      const t = alongX ? hit.x - seg.cx : hit.z - seg.cz;
      if (Math.abs(t) > seg.len / 2 + 0.8) continue;
      if (hit.y < -0.5 || hit.y > ROOM_H + 0.5) continue;
      const dist = ray.origin.distanceToSquared(hit);
      if (!best || dist < best.dist) best = { seg, hit: hit.clone(), dist };
    }
    if (!best) return;
    const seg = best.seg;
    const alongX = seg.nz !== 0;
    const t = THREE.MathUtils.clamp(
      alongX ? best.hit.x - seg.cx : best.hit.z - seg.cz,
      -(seg.len / 2 - halfW - 0.05),
      seg.len / 2 - halfW - 0.05
    );
    item.group.position.set(
      alongX ? seg.cx + t : seg.cx + seg.nx * WALL_GAP,
      this.wallItemY(item, best.hit.y),
      alongX ? seg.cz + seg.nz * WALL_GAP : seg.cz + t
    );
    item.group.rotation.y = Math.atan2(seg.nx, seg.nz);
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (this.mode === 'walk') {
      this.onWalkPointerUp(e);
      return;
    }
    if (this.dragging && e.pointerId === this.dragPointerId) {
      if (this.dragMoved) {
        audio.place();
        this.scheduleSave();
      }
      this.dragging = null;
      this.dragPointerId = null;
      this.riders = [];
      if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      this.controls.enabled = true;
    } else if (!this.dragging) {
      this.controls.enabled = true;
    }
  };

  // ------------------------------------------------------------- fx

  private popIn(item: PlacedItem): void {
    const target = Math.abs(item.group.scale.x);
    const sign = item.group.scale.x < 0 ? -1 : 1;
    this.tweens.push({
      t: 0,
      dur: 0.28,
      step: (k) => {
        const overshoot = 1 + Math.sin(k * Math.PI) * 0.12;
        const v = target * (0.5 + 0.5 * k) * overshoot;
        item.group.scale.set(v * sign, v, v);
      },
      done: () => item.group.scale.set(target * sign, target, target),
    });
  }

  // ------------------------------------------------------------- walk mode

  getMode(): GameMode {
    return this.mode;
  }

  toggleWalk(): void {
    if (this.mode === 'walk') this.exitWalk();
    else this.enterWalk();
  }

  enterWalk(): void {
    if (this.mode === 'walk') return;
    this.select(null);
    this.savedCam = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone(),
      fov: this.camera.fov,
    };
    this.controls.enabled = false;
    // Solid furniture becomes collision boxes; rugs, wall decor and small
    // floor props stay walkable.
    this.walkBlockers = this.items
      .filter((i) => {
        if (i.def.rug || i.def.wall) return false;
        return (i.bbox.max.y - i.bbox.min.y) * i.group.scale.y > 0.28;
      })
      .map((i) => {
        const { hw, hd, cx, cz } = this.footprintHalf(i);
        return { x: i.group.position.x + cx, z: i.group.position.z + cz, hw, hd };
      });
    const spawn = this.findWalkSpawn();
    this.camera.position.set(spawn.x, 1.55, spawn.z);
    this.walkYaw = Math.atan2(spawn.x, spawn.z);
    this.walkPitch = -0.05;
    this.walkKeys.clear();
    this.camera.rotation.order = 'YXZ';
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    this.mode = 'walk';
    this.onModeChange('walk');
    this.onHint('W/S move · A/D turn · drag to look · tap furniture to interact · Esc exits');
    audio.click();
  }

  exitWalk(): void {
    if (this.mode !== 'walk') return;
    this.mode = 'edit';
    this.lookPointer = null;
    this.movePointer = null;
    this.moveVec = { x: 0, y: 0 };
    this.onJoystick(null);
    if (this.savedCam) {
      this.camera.position.copy(this.savedCam.pos);
      this.controls.target.copy(this.savedCam.target);
      this.camera.fov = this.savedCam.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.rotation.order = 'XYZ';
    this.controls.enabled = true;
    this.onModeChange('edit');
    this.onHint('Tap an item in the catalog to add it · drag furniture to arrange your room');
    audio.click();
  }

  private insideFloor(x: number, z: number): boolean {
    return this.rects.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  }

  private walkCollides(x: number, z: number): boolean {
    const r = 0.22;
    // Sample a ring of points so corridors across rect boundaries stay walkable.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (!this.insideFloor(x + Math.cos(a) * r, z + Math.sin(a) * r)) return true;
    }
    for (const b of this.walkBlockers) {
      const dx = Math.max(Math.abs(x - b.x) - b.hw, 0);
      const dz = Math.max(Math.abs(z - b.z) - b.hd, 0);
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  private findWalkSpawn(): { x: number; z: number } {
    for (let ring = 0; ring < 12; ring++) {
      const rr = ring * 0.4;
      const steps = ring === 0 ? 1 : ring * 8;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = 0.6 + Math.cos(a) * rr;
        const z = 1.6 + Math.sin(a) * rr;
        if (!this.walkCollides(x, z)) return { x, z };
      }
    }
    return { x: 0, z: 0 };
  }

  private updateWalk(dt: number): void {
    const k = this.walkKeys;
    // Keyboard left/right turns (tank-style); the touch joystick still strafes
    // because the second thumb already owns the look.
    const turn = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    this.walkYaw -= turn * 1.9 * dt;
    let forward = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    let strafe = 0;
    forward += -this.moveVec.y;
    strafe += this.moveVec.x;
    const mag = Math.hypot(forward, strafe);
    if (mag > 1) {
      forward /= mag;
      strafe /= mag;
    }
    const speed = 2.1;
    const sin = Math.sin(this.walkYaw), cos = Math.cos(this.walkYaw);
    const vx = (-sin * forward + cos * strafe) * speed * dt;
    const vz = (-cos * forward - sin * strafe) * speed * dt;
    const p = this.camera.position;
    // Axis-separated moves so we slide along furniture instead of sticking.
    if (!this.walkCollides(p.x + vx, p.z)) p.x += vx;
    if (!this.walkCollides(p.x, p.z + vz)) p.z += vz;
    const moving = Math.hypot(vx, vz) > 0.0004;
    if (moving) this.walkBob += dt * 9;
    p.y = 1.55 + (moving ? Math.sin(this.walkBob) * 0.018 : 0);
    this.camera.rotation.set(this.walkPitch, this.walkYaw, 0);
  }

  private onWalkKey = (e: KeyboardEvent): void => {
    if (this.mode !== 'walk') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (e.type === 'keydown') this.walkKeys.add(key);
      else this.walkKeys.delete(key);
      e.preventDefault();
    }
  };

  private onWalkPointerDown(e: PointerEvent): void {
    const isTouch = e.pointerType === 'touch';
    const leftHalf = e.clientX < window.innerWidth / 2;
    if (isTouch && leftHalf && this.movePointer === null) {
      this.movePointer = e.pointerId;
      this.moveOrigin = { x: e.clientX, y: e.clientY };
      this.moveVec = { x: 0, y: 0 };
      this.onJoystick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    } else if (this.lookPointer === null) {
      this.lookPointer = e.pointerId;
      this.lookLast = { x: e.clientX, y: e.clientY };
      this.lookMoved = 0;
    }
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events cannot be captured; fine.
    }
  }

  private onWalkPointerMove(e: PointerEvent): void {
    if (e.pointerId === this.movePointer) {
      const dx = e.clientX - this.moveOrigin.x;
      const dy = e.clientY - this.moveOrigin.y;
      const range = 52;
      this.moveVec = {
        x: THREE.MathUtils.clamp(dx / range, -1, 1),
        y: THREE.MathUtils.clamp(dy / range, -1, 1),
      };
      this.onJoystick({ x: this.moveOrigin.x, y: this.moveOrigin.y, dx: THREE.MathUtils.clamp(dx, -range, range), dy: THREE.MathUtils.clamp(dy, -range, range) });
    } else if (e.pointerId === this.lookPointer) {
      const dx = e.clientX - this.lookLast.x;
      const dy = e.clientY - this.lookLast.y;
      this.lookLast = { x: e.clientX, y: e.clientY };
      this.lookMoved += Math.abs(dx) + Math.abs(dy);
      this.walkYaw -= dx * 0.0052;
      this.walkPitch = THREE.MathUtils.clamp(this.walkPitch - dy * 0.0052, -1.25, 1.25);
    }
  }

  private onWalkPointerUp(e: PointerEvent): void {
    if (e.pointerId === this.movePointer) {
      this.movePointer = null;
      this.moveVec = { x: 0, y: 0 };
      this.onJoystick(null);
    }
    if (e.pointerId === this.lookPointer) {
      this.lookPointer = null;
      // A press that barely moved is a tap: poke whatever is in reach.
      if (this.lookMoved < 10) this.walkTap(e);
    }
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
  }

  private walkTap(e: PointerEvent): void {
    this.setPointer(e);
    const hits = this.raycaster.intersectObjects(this.items.map((i) => i.group), true);
    for (const hit of hits) {
      if (hit.distance > 3.2) return;
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData.item) {
          this.interact(o.userData.item as PlacedItem);
          return;
        }
        o = o.parent;
      }
    }
  }

  // ------------------------------------------------------------- interactions

  private static readonly POWERED = new Set([
    'floor-lamp', 'table-lamp', 'paper-lantern', 'candles', 'lava-lamp', 'softbox',
    'fairy-lights', 'dollhouse', 'air-purifier', 'wall-ac', 'desktop',
    'monitor', 'laptop', 'ultrawide',
  ]);

  private interact(item: PlacedItem): void {
    const id = item.def.id;
    if (RoomGame.POWERED.has(id)) {
      const on = this.togglePower(item);
      audio.click();
      this.onToast(`${item.def.name} ${on ? 'on' : 'off'}`);
      return;
    }
    if (['radio', 'record-player', 'speakers'].includes(id)) {
      const playing = audio.toggleTune();
      this.wiggle(item, 0.03);
      this.onToast(playing ? `♪ ${item.def.name} playing` : 'Music off');
      return;
    }
    if (id === 'music-box') {
      audio.musicBox();
      this.wiggle(item, 0.05);
      return;
    }
    if (id === 'clock' || id === 'mantel-clock') {
      audio.chime();
      this.wiggle(item, 0.02);
      return;
    }
    if (['plant', 'small-plant', 'fern', 'mushroom-pot', 'vase', 'snow-globe'].includes(id)) {
      audio.rustle();
      this.wiggle(item, 0.09);
      return;
    }
    if (['teddy', 'train', 'books', 'cushion'].includes(id)) {
      audio.squeak();
      this.wiggle(item, 0.08);
      return;
    }
    if (id === 'rocking-chair') {
      audio.creak();
      this.rock(item);
      return;
    }
    if (id === 'door' || id === 'balcony-doors') {
      audio.knock();
      this.onToast('Knock knock…');
      return;
    }
    audio.click();
    this.pulse(item);
  }

  /** Toggles an item's lights, glowing parts, and screens on or off. */
  private togglePower(item: PlacedItem): boolean {
    const on = !(item.group.userData.powered ?? true);
    item.group.userData.powered = on;
    item.group.traverse((c) => {
      if ((c as THREE.Light).isLight) (c as THREE.Light).visible = on;
      if (c instanceof THREE.Mesh) {
        const m = c.material as THREE.MeshStandardMaterial;
        if (!m.isMeshStandardMaterial) return;
        const glows = m.emissive.r + m.emissive.g + m.emissive.b > 0.1 && m.emissiveIntensity > 0.15;
        if (glows || m.userData.baseEI !== undefined) {
          if (m.userData.baseEI === undefined) m.userData.baseEI = m.emissiveIntensity;
          m.emissiveIntensity = on ? (m.userData.baseEI as number) : 0.02;
        }
        if (m.userData.screen) {
          if (m.userData.baseColor === undefined) m.userData.baseColor = m.color.getHex();
          m.color.setHex(on ? (m.userData.baseColor as number) : 0x16181c);
        }
      }
    });
    return on;
  }

  private wiggle(item: PlacedItem, amp: number): void {
    const g = item.group;
    const r0 = g.rotation.z;
    this.tweens.push({
      t: 0,
      dur: 0.55,
      step: (k) => {
        g.rotation.z = r0 + Math.sin(k * Math.PI * 6) * (1 - k) * amp;
      },
      done: () => {
        g.rotation.z = r0;
      },
    });
  }

  private rock(item: PlacedItem): void {
    const g = item.group;
    const r0 = g.rotation.x;
    // 'YXZ' applies the pitch after the yaw, so the chair rocks front-to-back
    // along its runners no matter which way the user rotated it.
    const prevOrder = g.rotation.order;
    g.rotation.order = 'YXZ';
    this.tweens.push({
      t: 0,
      dur: 1.7,
      step: (k) => {
        g.rotation.x = r0 + Math.sin(k * Math.PI * 7) * (1 - k) * 0.09;
      },
      done: () => {
        g.rotation.x = r0;
        g.rotation.order = prevOrder;
      },
    });
  }

  private pulse(item: PlacedItem): void {
    const g = item.group;
    const s0 = g.scale.clone();
    this.tweens.push({
      t: 0,
      dur: 0.3,
      step: (k) => {
        const f = 1 + Math.sin(k * Math.PI) * 0.05;
        g.scale.set(s0.x * f, s0.y * f, s0.z * f);
      },
      done: () => {
        g.scale.copy(s0);
      },
    });
  }

  // ------------------------------------------------------------- photography

  /** Renders a fresh frame and returns it as a PNG data URL. */
  takePhoto(): string {
    this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    audio.shutter();
    return url;
  }

  // ------------------------------------------------------------- moods

  setMood(name: MoodName): void {
    const m = MOODS[name];
    this.mood = name;
    this.scene.background = new THREE.Color(m.bg);
    this.hemi.color.set(m.hemiSky);
    this.hemi.groundColor.set(m.hemiGround);
    this.hemi.intensity = m.hemiIntensity;
    this.sun.color.set(m.sunColor);
    this.sun.intensity = m.sunIntensity;
    this.ambient.intensity = m.ambient;
    this.scheduleSave();
  }

  getMood(): MoodName {
    return this.mood;
  }

  // ------------------------------------------------------------- persistence

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.persist(), 350);
  }

  private persist(): void {
    const items: SavedItem[] = this.items.map((i) => ({
      def: i.def.id,
      pos: [i.group.position.x, i.group.position.y, i.group.position.z],
      rot: i.group.rotation.y,
      scale: Math.abs(i.group.scale.x),
      flip: i.group.scale.x < 0 || undefined,
      color: i.color,
    }));
    saveRoom({ version: 1, mood: this.mood, room: { ...this.roomCfg }, items });
  }

  private restore(): void {
    const saved = loadRoom();
    const savedShape = saved?.room?.shape as RoomShape | undefined;
    const cfg: RoomConfig =
      saved?.room && savedShape && ROOM_SHAPES.includes(savedShape)
        ? { w: saved.room.w, d: saved.room.d, shape: savedShape }
        : { ...DEFAULT_ROOM };
    this.applyRoom(cfg);
    if (!saved || saved.items.length === 0) {
      this.starterRoom();
      this.setMood('day');
      return;
    }
    for (const s of saved.items) {
      const def = getDef(s.def);
      if (!def) continue;
      const item = this.buildItem(def, s.color);
      item.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
      item.group.rotation.y = s.rot;
      // Older saves stored a signed scale; normalize to magnitude + flip flag.
      const mag = Math.abs(s.scale) || 1;
      item.group.scale.set(s.flip || s.scale < 0 ? -mag : mag, mag, mag);
      // Floor-anchored wall items re-derive their height so model tweaks
      // (or older saves) can never leave them floating.
      if (def.floorWall) item.group.position.y = -item.bbox.min.y * s.scale;
      if (def.colors.includes(s.color) || /^#[0-9a-f]{6}$/i.test(s.color)) {
        this.recolorItemDirect(item, s.color);
      }
    }
    this.setMood((saved.mood as MoodName) in MOODS ? (saved.mood as MoodName) : 'day');
    this.onItemsChange(this.items.length);
  }

  private recolorItemDirect(item: PlacedItem, color: string): void {
    item.color = color;
    item.group.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        const mat = c.material as THREE.MeshStandardMaterial;
        if (mat.userData?.tint) mat.color.set(color);
      }
    });
  }

  /** A welcoming starter arrangement so the first screen is a room, not a void. */
  private starterRoom(): void {
    const place = (id: string, x: number, z: number, rot = 0, color?: string): void => {
      const def = getDef(id);
      if (!def) return;
      const item = this.buildItem(def, color ?? def.colors[0]);
      item.group.position.set(x, 0, z);
      item.group.rotation.y = rot;
      if (color) this.recolorItemDirect(item, color);
      this.settleVertical(item);
    };
    place('rect-rug', 0.4, 0.6);
    place('sofa', 0.4, -2.2);
    place('coffee-table', 0.4, 0.1);
    place('books', 0.28, 0.02, 0.4);
    place('small-plant', 0.72, 0.2);
    place('bookshelf', -3.2, -3.15);
    place('plant', 3.7, -2.9);
    place('floor-lamp', -1.6, -2.8);
    place('side-table', 2.1, -2.5);
    place('table-lamp', 2.1, -2.5);
    const placeWall = (id: string, x: number, y: number, z: number, rotY = 0): void => {
      const def = getDef(id);
      if (!def) return;
      const item = this.buildItem(def, def.colors[0]);
      item.group.position.set(x, y, z);
      item.group.rotation.y = rotY;
      if (def.floorWall) item.group.position.y = -item.bbox.min.y;
    };
    placeWall('frame', 0.7, 1.85, -this.roomCfg.d / 2 + WALL_GAP);
    placeWall('clock', -1.4, 2.1, -this.roomCfg.d / 2 + WALL_GAP);
    placeWall('window', -this.roomCfg.w / 2 + WALL_GAP, 1.75, -0.9, Math.PI / 2);
    this.onItemsChange(this.items.length);
    this.persist();
  }
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose();
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) m.dispose();
    }
  });
}
