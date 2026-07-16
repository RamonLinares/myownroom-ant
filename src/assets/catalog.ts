import * as THREE from 'three';
import { wood, fabric, matte, metal, rugTexture, fabricTexture, type MaterialKind } from './materials';

export type Category =
  | 'Seating' | 'Beds' | 'Tables' | 'Storage' | 'Workspace'
  | 'Decor' | 'Toys' | 'Lighting' | 'Plants' | 'Rugs' | 'Wall' | 'Seasonal';

export interface ItemDef {
  id: string;
  name: string;
  cat: Category;
  /** Swatches offered in the inspector; first one is the default. */
  colors: string[];
  make: (color: string) => THREE.Group;
  /** Mounted on a wall instead of standing on the floor. */
  wall?: boolean;
  /** Wall item whose bottom stays anchored to the floor (doors, balcony doors). */
  floorWall?: boolean;
  /** Other items may be stacked on top of this one. */
  surface?: boolean;
  /** Small enough to be stacked onto surfaces. */
  stackable?: boolean;
  /** Flat floor covering: ignores stacking entirely. */
  rug?: boolean;
  /**
   * Finishes the tinted parts may wear; the first entry must match how the
   * factory builds the item. Omitted for items whose tinted materials are
   * too special to swap (rugs, glowing parts, sheer curtains…).
   */
  materials?: MaterialKind[];
}

function shadow(o: THREE.Object3D): void {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
}

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function cyl(rTop: number, rBottom: number, h: number, mat: THREE.Material, seg = 24): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
}

function rounded(w: number, h: number, d: number, r: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSize: r * 0.4, bevelThickness: r * 0.4, bevelSegments: 2, curveSegments: 6 });
  geo.translate(0, 0, -d / 2);
  return new THREE.Mesh(geo, mat);
}

/** Tintable material: marked so recolor can find it. */
function tint(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  mat.userData.tint = true;
  return mat;
}

const WOOD_DARK = '#6b4a2f';
const WOOD_LIGHT = '#b98a5e';
const METAL_GREY = '#8f9299';

function legSet(group: THREE.Group, w: number, d: number, h: number, r: number, mat: THREE.Material, inset = 0.06): void {
  const positions: Array<[number, number]> = [
    [w / 2 - inset, d / 2 - inset], [-(w / 2 - inset), d / 2 - inset],
    [w / 2 - inset, -(d / 2 - inset)], [-(w / 2 - inset), -(d / 2 - inset)],
  ];
  for (const [x, z] of positions) {
    const leg = cyl(r, r * 0.8, h, mat, 12);
    leg.position.set(x, h / 2, z);
    group.add(leg);
  }
}

// ---------------------------------------------------------------- factories

function makeSofa(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(fabric(color));
  const cushion = tint(fabric(color));
  const base = rounded(2.0, 0.42, 0.9, 0.07, body);
  base.position.y = 0.33;
  g.add(base);
  const back = rounded(2.0, 0.62, 0.24, 0.08, body);
  back.position.set(0, 0.78, -0.36);
  back.rotation.x = -0.09;
  g.add(back);
  for (const side of [-1, 1]) {
    const arm = rounded(0.24, 0.5, 0.86, 0.08, body);
    arm.position.set(side * 0.94, 0.62, 0.01);
    g.add(arm);
  }
  for (const side of [-0.48, 0.48]) {
    const c = rounded(0.86, 0.18, 0.74, 0.07, cushion);
    c.position.set(side, 0.6, 0.04);
    g.add(c);
    const pillow = rounded(0.62, 0.42, 0.16, 0.08, cushion);
    pillow.position.set(side, 0.85, -0.28);
    pillow.rotation.x = -0.12;
    g.add(pillow);
  }
  legSet(g, 1.9, 0.84, 0.13, 0.035, wood(WOOD_DARK));
  shadow(g);
  return g;
}

function makeArmchair(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(fabric(color));
  const base = rounded(0.96, 0.4, 0.86, 0.07, body);
  base.position.y = 0.32;
  g.add(base);
  const seat = rounded(0.72, 0.16, 0.68, 0.06, body);
  seat.position.set(0, 0.56, 0.03);
  g.add(seat);
  const back = rounded(0.96, 0.58, 0.22, 0.08, body);
  back.position.set(0, 0.74, -0.33);
  back.rotation.x = -0.1;
  g.add(back);
  for (const side of [-1, 1]) {
    const arm = rounded(0.18, 0.42, 0.8, 0.07, body);
    arm.position.set(side * 0.44, 0.6, 0);
    g.add(arm);
  }
  legSet(g, 0.86, 0.78, 0.12, 0.032, wood(WOOD_DARK));
  shadow(g);
  return g;
}

function makeChair(color: string): THREE.Group {
  const g = new THREE.Group();
  const woodMat = tint(wood(color));
  const seat = rounded(0.46, 0.06, 0.44, 0.03, woodMat);
  seat.position.y = 0.45;
  g.add(seat);
  const back = rounded(0.44, 0.5, 0.05, 0.03, woodMat);
  back.position.set(0, 0.73, -0.21);
  back.rotation.x = -0.08;
  g.add(back);
  legSet(g, 0.42, 0.4, 0.44, 0.022, wood(WOOD_DARK), 0.04);
  shadow(g);
  return g;
}

function makeBed(color: string): THREE.Group {
  const g = new THREE.Group();
  const frame = wood(WOOD_LIGHT);
  const duvet = tint(fabric(color));
  const base = box(1.7, 0.28, 2.3, frame);
  base.position.y = 0.24;
  g.add(base);
  const head = rounded(1.7, 0.75, 0.1, 0.05, frame);
  head.position.set(0, 0.62, -1.12);
  g.add(head);
  const mattress = rounded(1.6, 0.22, 2.16, 0.08, matte('#f4efe6', 0.9));
  mattress.position.y = 0.48;
  g.add(mattress);
  const cover = rounded(1.64, 0.16, 1.58, 0.07, duvet);
  cover.position.set(0, 0.6, 0.3);
  g.add(cover);
  for (const side of [-0.42, 0.42]) {
    const pillow = rounded(0.62, 0.16, 0.42, 0.07, matte('#ffffff', 0.92));
    pillow.position.set(side, 0.62, -0.82);
    pillow.rotation.x = -0.14;
    g.add(pillow);
  }
  legSet(g, 1.62, 2.2, 0.12, 0.04, wood(WOOD_DARK), 0.08);
  shadow(g);
  return g;
}

function makeDesk(color: string): THREE.Group {
  const g = new THREE.Group();
  const top = rounded(1.5, 0.06, 0.72, 0.03, tint(wood(color)));
  top.position.y = 0.74;
  g.add(top);
  const drawer = box(0.44, 0.71, 0.6, wood(WOOD_DARK));
  drawer.position.set(0.48, 0.355, 0);
  g.add(drawer);
  for (let i = 0; i < 3; i++) {
    const front = box(0.4, 0.19, 0.02, wood(WOOD_LIGHT));
    front.position.set(0.48, 0.14 + i * 0.22, 0.31);
    g.add(front);
    const knob = cyl(0.018, 0.018, 0.03, metal(METAL_GREY), 10);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.48, 0.14 + i * 0.22, 0.33);
    g.add(knob);
  }
  for (const [x, z] of [[-0.66, 0.3], [-0.66, -0.3]] as Array<[number, number]>) {
    const leg = box(0.05, 0.72, 0.05, metal('#3d3f45', 0.5));
    leg.position.set(x, 0.36, z);
    g.add(leg);
  }
  shadow(g);
  return g;
}

function makeCoffeeTable(color: string): THREE.Group {
  const g = new THREE.Group();
  const top = rounded(1.05, 0.06, 0.6, 0.04, tint(wood(color)));
  top.position.y = 0.42;
  g.add(top);
  const shelf = rounded(0.9, 0.04, 0.48, 0.03, wood(WOOD_DARK));
  shelf.position.y = 0.16;
  g.add(shelf);
  legSet(g, 0.96, 0.52, 0.4, 0.028, wood(WOOD_DARK));
  shadow(g);
  return g;
}

function makeSideTable(color: string): THREE.Group {
  const g = new THREE.Group();
  const top = cyl(0.28, 0.28, 0.05, tint(wood(color)), 28);
  top.position.y = 0.52;
  g.add(top);
  const stem = cyl(0.035, 0.05, 0.5, wood(WOOD_DARK), 14);
  stem.position.y = 0.26;
  g.add(stem);
  const foot = cyl(0.18, 0.2, 0.04, wood(WOOD_DARK), 24);
  foot.position.y = 0.02;
  g.add(foot);
  shadow(g);
  return g;
}

function makeBookshelf(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const w = 0.95, h = 1.9, d = 0.3;
  const backPanel = box(w, h, 0.02, body);
  backPanel.position.set(0, h / 2, -d / 2 + 0.01);
  g.add(backPanel);
  for (const side of [-1, 1]) {
    const panel = box(0.03, h, d, body);
    panel.position.set(side * (w / 2 - 0.015), h / 2, 0);
    g.add(panel);
  }
  const shelves = 5;
  const bookColors = ['#a24a3f', '#3f6ba2', '#4f8a58', '#c9a04a', '#7a5aa0', '#b7674f', '#40809b'];
  let bi = 0;
  for (let i = 0; i <= shelves; i++) {
    const y = 0.05 + (i * (h - 0.1)) / shelves;
    const plank = box(w - 0.06, 0.035, d, body);
    plank.position.set(0, y, 0);
    g.add(plank);
    if (i < shelves) {
      let x = -w / 2 + 0.09;
      while (x < w / 2 - 0.14) {
        const bw = 0.045 + ((bi * 37) % 10) * 0.004;
        const bh = 0.2 + ((bi * 53) % 10) * 0.012;
        const book = box(bw, bh, 0.2, matte(bookColors[bi % bookColors.length], 0.8));
        book.position.set(x + bw / 2, y + bh / 2 + 0.02, -0.02);
        book.rotation.z = (bi % 9 === 0) ? 0.09 : 0;
        g.add(book);
        x += bw + 0.012;
        bi++;
        if (bi % 11 === 0) x += 0.08;
      }
    }
  }
  shadow(g);
  return g;
}

function makeWardrobe(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const w = 1.2, h = 2.0, d = 0.6;
  const cab = box(w, h, d, body);
  cab.position.y = h / 2 + 0.06;
  g.add(cab);
  for (const side of [-1, 1]) {
    const door = box(w / 2 - 0.03, h - 0.08, 0.02, wood(WOOD_LIGHT));
    door.position.set(side * (w / 4), h / 2 + 0.06, d / 2 + 0.011);
    g.add(door);
    const handle = cyl(0.012, 0.012, 0.22, metal(METAL_GREY), 10);
    handle.position.set(side * 0.09, h / 2 + 0.06, d / 2 + 0.035);
    g.add(handle);
  }
  const plinth = box(w - 0.06, 0.06, d - 0.06, wood(WOOD_DARK));
  plinth.position.y = 0.03;
  g.add(plinth);
  shadow(g);
  return g;
}

function makeDresser(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const w = 1.1, h = 0.86, d = 0.48;
  const cab = box(w, h - 0.1, d, body);
  cab.position.y = (h - 0.1) / 2 + 0.1;
  g.add(cab);
  for (let i = 0; i < 3; i++) {
    const front = box(w - 0.12, 0.2, 0.02, wood(WOOD_LIGHT));
    front.position.set(0, 0.24 + i * 0.25, d / 2 + 0.011);
    g.add(front);
    const knob = box(0.16, 0.02, 0.03, metal(METAL_GREY));
    knob.position.set(0, 0.31 + i * 0.25, d / 2 + 0.03);
    g.add(knob);
  }
  legSet(g, w - 0.1, d - 0.08, 0.1, 0.028, wood(WOOD_DARK));
  shadow(g);
  return g;
}

function makePlant(color: string): THREE.Group {
  const g = new THREE.Group();
  const pot = cyl(0.17, 0.13, 0.26, tint(matte(color, 0.7)), 20);
  pot.position.y = 0.13;
  g.add(pot);
  const soil = cyl(0.15, 0.15, 0.03, matte('#3a2c20', 0.95), 20);
  soil.position.y = 0.26;
  g.add(soil);
  const leafMat = matte('#3f7d46', 0.7);
  const leafGeo = new THREE.SphereGeometry(0.14, 8, 6);
  leafGeo.scale(1, 1.6, 0.35);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    const lean = 0.5 + (i % 3) * 0.16;
    leaf.position.set(Math.cos(a) * 0.12, 0.46 + (i % 3) * 0.1, Math.sin(a) * 0.12);
    leaf.rotation.set(Math.sin(a) * lean, a, -Math.cos(a) * lean);
    g.add(leaf);
  }
  shadow(g);
  return g;
}

function makeSmallPlant(color: string): THREE.Group {
  const g = new THREE.Group();
  const pot = cyl(0.08, 0.06, 0.12, tint(matte(color, 0.7)), 16);
  pot.position.y = 0.06;
  g.add(pot);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), matte('#4c8a52', 0.75));
  bush.position.y = 0.18;
  g.add(bush);
  const bush2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 1), matte('#5d9c60', 0.75));
  bush2.position.set(0.05, 0.24, 0.02);
  g.add(bush2);
  shadow(g);
  return g;
}

function makeFloorLamp(color: string): THREE.Group {
  const g = new THREE.Group();
  const base = cyl(0.16, 0.18, 0.04, metal('#3d3f45', 0.5), 24);
  base.position.y = 0.02;
  g.add(base);
  const pole = cyl(0.018, 0.018, 1.35, metal(METAL_GREY), 12);
  pole.position.y = 0.71;
  g.add(pole);
  const shade = cyl(0.16, 0.24, 0.3, tint(matte(color, 0.8)), 24);
  shade.position.y = 1.5;
  g.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffd98a', emissiveIntensity: 1.4, roughness: 0.4 })
  );
  bulb.position.y = 1.42;
  g.add(bulb);
  const light = new THREE.PointLight('#ffd9a0', 6, 4.5, 1.8);
  light.position.y = 1.42;
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

function makeTableLamp(color: string): THREE.Group {
  const g = new THREE.Group();
  const base = cyl(0.08, 0.1, 0.03, tint(matte(color, 0.7)), 20);
  base.position.y = 0.015;
  g.add(base);
  const pole = cyl(0.012, 0.012, 0.24, metal(METAL_GREY), 10);
  pole.position.y = 0.15;
  g.add(pole);
  const shade = cyl(0.08, 0.12, 0.14, tint(matte(color, 0.8)), 20);
  shade.position.y = 0.33;
  g.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffd98a', emissiveIntensity: 1.4, roughness: 0.4 })
  );
  bulb.position.y = 0.3;
  g.add(bulb);
  const light = new THREE.PointLight('#ffd9a0', 2.5, 2.5, 1.8);
  light.position.y = 0.32;
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

function makeBookStack(color: string): THREE.Group {
  const g = new THREE.Group();
  const tones = [color, '#4f8a58', '#c9a04a'];
  let y = 0;
  for (let i = 0; i < 3; i++) {
    const h = 0.045;
    const mat = i === 0 ? tint(matte(tones[i], 0.8)) : matte(tones[i], 0.8);
    const b = box(0.24 - i * 0.02, h, 0.17 - i * 0.01, mat);
    b.position.y = y + h / 2;
    b.rotation.y = (i - 1) * 0.25;
    g.add(b);
    y += h;
  }
  shadow(g);
  return g;
}

function makeVase(color: string): THREE.Group {
  const g = new THREE.Group();
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = 0.05 + Math.sin(t * Math.PI) * 0.055 + t * 0.005;
    points.push(new THREE.Vector2(r, t * 0.28));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 20), tint(matte(color, 0.35)));
  g.add(body);
  const stemMat = matte('#5d7d4a', 0.8);
  for (const a of [-0.3, 0.1, 0.4]) {
    const stem = cyl(0.006, 0.006, 0.26, stemMat, 6);
    stem.position.set(Math.sin(a) * 0.03, 0.38, Math.cos(a) * 0.02);
    stem.rotation.z = a;
    g.add(stem);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), matte('#e8b04a', 0.6));
    bloom.position.set(Math.sin(a) * 0.03 - Math.sin(a) * -0.12, 0.5, Math.cos(a) * 0.02);
    g.add(bloom);
  }
  shadow(g);
  return g;
}

function makeRoundRug(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = tint(new THREE.MeshStandardMaterial({ color, map: rugTexture, roughness: 0.96 }));
  const rug = cyl(0.95, 0.95, 0.024, mat, 40);
  rug.position.y = 0.012;
  rug.receiveShadow = true;
  g.add(rug);
  return g;
}

function makeRectRug(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = tint(new THREE.MeshStandardMaterial({ color, map: rugTexture, roughness: 0.96 }));
  const rug = box(2.2, 0.024, 1.5, mat);
  rug.position.y = 0.012;
  rug.receiveShadow = true;
  g.add(rug);
  return g;
}

function makePictureFrame(color: string): THREE.Group {
  const g = new THREE.Group();
  const frame = box(0.56, 0.72, 0.04, tint(wood(color)));
  g.add(frame);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, '#f5e6c8');
  grad.addColorStop(0.62, '#e8a86a');
  grad.addColorStop(1, '#9a5a3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = '#f7d98a';
  ctx.beginPath();
  ctx.arc(88, 44, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(90,58,40,0.85)';
  for (const [hx, hh] of [[10, 60], [34, 44], [58, 70], [96, 52]] as Array<[number, number]>) {
    ctx.fillRect(hx, 160 - hh, 18, hh);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const artMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  artMat.userData.art = true;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), artMat);
  art.position.z = 0.021;
  g.add(art);
  shadow(g);
  return g;
}

function makeWallClock(color: string): THREE.Group {
  const g = new THREE.Group();
  const rim = cyl(0.22, 0.22, 0.045, tint(wood(color)), 32);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const face = cyl(0.185, 0.185, 0.05, matte('#f6f1e6', 0.6), 32);
  face.rotation.x = Math.PI / 2;
  g.add(face);
  const handMat = matte('#2c2c2c', 0.5);
  const hour = box(0.02, 0.1, 0.012, handMat);
  hour.position.set(0.02, 0.04, 0.028);
  hour.rotation.z = -0.5;
  g.add(hour);
  const minute = box(0.014, 0.15, 0.012, handMat);
  minute.position.set(-0.03, 0.05, 0.03);
  minute.rotation.z = 0.6;
  g.add(minute);
  shadow(g);
  return g;
}

function makeWallShelf(color: string): THREE.Group {
  const g = new THREE.Group();
  const plank = box(0.9, 0.045, 0.22, tint(wood(color)));
  g.add(plank);
  for (const side of [-0.36, 0.36]) {
    const bracket = box(0.03, 0.12, 0.18, metal('#3d3f45', 0.5));
    bracket.position.set(side, -0.08, -0.01);
    g.add(bracket);
  }
  const tones = ['#a24a3f', '#3f6ba2', '#4f8a58', '#c9a04a'];
  let x = -0.36;
  for (let i = 0; i < 6; i++) {
    const bw = 0.05, bh = 0.17 + (i % 3) * 0.02;
    const book = box(bw, bh, 0.14, matte(tones[i % tones.length], 0.8));
    book.position.set(x, 0.022 + bh / 2, 0);
    book.rotation.z = i === 5 ? 0.2 : 0;
    g.add(book);
    x += bw + 0.014;
  }
  shadow(g);
  return g;
}

const BOOK_TONES = ['#a24a3f', '#3f6ba2', '#4f8a58', '#c9a04a', '#7a5aa0', '#b7674f', '#40809b'];

/** Fills a shelf span with a row of slightly irregular books. */
function addBookRow(g: THREE.Group, x0: number, x1: number, y: number, z: number, seedOffset = 0): void {
  let x = x0;
  let bi = seedOffset;
  while (x < x1 - 0.06) {
    const bw = 0.045 + ((bi * 37) % 10) * 0.004;
    const bh = 0.17 + ((bi * 53) % 10) * 0.012;
    const book = box(bw, bh, 0.16, matte(BOOK_TONES[bi % BOOK_TONES.length], 0.8));
    book.position.set(x + bw / 2, y + bh / 2, z);
    book.rotation.z = bi % 9 === 0 ? 0.09 : 0;
    g.add(book);
    x += bw + 0.012;
    bi++;
    if (bi % 11 === 0) x += 0.07;
  }
}

// ------------------------------------------------------ beds & seating

function makeCanopyBed(color: string): THREE.Group {
  const g = makeBed(color);
  const post = wood(WOOD_DARK);
  for (const [x, z] of [[-0.82, -1.1], [0.82, -1.1], [-0.82, 1.1], [0.82, 1.1]] as Array<[number, number]>) {
    const p = cyl(0.035, 0.045, 2.05, post, 10);
    p.position.set(x, 1.02, z);
    g.add(p);
  }
  const railX = box(1.68, 0.05, 0.05, post);
  railX.position.set(0, 2.05, -1.1);
  g.add(railX, (() => { const r = railX.clone(); r.position.z = 1.1; return r; })());
  for (const side of [-0.82, 0.82]) {
    const railZ = box(0.05, 0.05, 2.24, post);
    railZ.position.set(side, 2.05, 0);
    g.add(railZ);
  }
  const curtain = tint(new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  for (const [x, z] of [[-0.82, -1.1], [0.82, -1.1]] as Array<[number, number]>) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.9), curtain);
    c.position.set(x * 0.92, 1.05, z);
    g.add(c);
  }
  shadow(g);
  return g;
}

function makeNightstand(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const cab = box(0.46, 0.4, 0.4, body);
  cab.position.y = 0.34;
  g.add(cab);
  const front = box(0.38, 0.16, 0.02, wood(WOOD_LIGHT));
  front.position.set(0, 0.4, 0.21);
  g.add(front);
  const knob = cyl(0.016, 0.016, 0.03, metal(METAL_GREY), 10);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0, 0.4, 0.23);
  g.add(knob);
  legSet(g, 0.4, 0.34, 0.14, 0.02, wood(WOOD_DARK), 0.03);
  shadow(g);
  return g;
}

function makeOttoman(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = cyl(0.3, 0.32, 0.32, tint(fabric(color)), 24);
  body.position.y = 0.18;
  g.add(body);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 28), tint(fabric(color)));
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.34;
  g.add(seam);
  const button = cyl(0.03, 0.03, 0.015, matte('#5a4a38', 0.8), 12);
  button.position.y = 0.345;
  g.add(button);
  shadow(g);
  return g;
}

function makeToybox(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const chest = box(0.8, 0.42, 0.45, body);
  chest.position.y = 0.25;
  g.add(chest);
  const lid = box(0.84, 0.08, 0.49, wood(WOOD_DARK));
  lid.position.y = 0.5;
  g.add(lid);
  for (const side of [-0.28, 0.28]) {
    const strap = box(0.05, 0.44, 0.47, metal(METAL_GREY, 0.5));
    strap.position.set(side, 0.25, 0);
    g.add(strap);
  }
  const latch = box(0.06, 0.08, 0.03, metal('#c9a04a', 0.4));
  latch.position.set(0, 0.42, 0.235);
  g.add(latch);
  legSet(g, 0.74, 0.4, 0.04, 0.025, wood(WOOD_DARK), 0.04);
  shadow(g);
  return g;
}

function makeCornerSofa(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(fabric(color));
  const baseA = rounded(2.1, 0.4, 0.85, 0.07, body);
  baseA.position.set(0, 0.32, 0);
  g.add(baseA);
  const baseB = rounded(0.85, 0.4, 1.25, 0.07, body);
  baseB.position.set(-0.62, 0.32, 1.02);
  g.add(baseB);
  const backA = rounded(2.1, 0.6, 0.22, 0.08, body);
  backA.position.set(0, 0.72, -0.33);
  g.add(backA);
  const backB = rounded(0.22, 0.6, 1.9, 0.08, body);
  backB.position.set(-0.94, 0.72, 0.68);
  g.add(backB);
  for (const [x, z, w, d] of [[0.5, 0.02, 0.9, 0.66], [-0.45, 0.02, 0.9, 0.66], [-0.6, 1.05, 0.62, 1.0]] as Array<[number, number, number, number]>) {
    const c = rounded(w, 0.16, d, 0.06, body);
    c.position.set(x, 0.58, z);
    g.add(c);
  }
  const arm = rounded(0.22, 0.5, 0.8, 0.07, body);
  arm.position.set(0.99, 0.6, 0);
  g.add(arm);
  shadow(g);
  return g;
}

function makeRockingChair(color: string): THREE.Group {
  const g = new THREE.Group();
  const woodMat = tint(wood(color));
  const dark = wood(WOOD_DARK);
  const seat = rounded(0.5, 0.05, 0.44, 0.03, woodMat);
  seat.position.y = 0.42;
  seat.rotation.x = 0.06;
  g.add(seat);
  // Slat back between two stiles, leaning gently rearward.
  const backTilt = -0.24;
  for (const side of [-0.21, 0.21]) {
    const stile = cyl(0.02, 0.024, 0.62, woodMat, 10);
    stile.position.set(side, 0.7, -0.2 - 0.28 * 0.12);
    stile.rotation.x = backTilt;
    g.add(stile);
  }
  for (let i = 0; i < 3; i++) {
    const y = 0.56 + i * 0.15;
    const slat = rounded(0.4, 0.09, 0.025, 0.012, woodMat);
    slat.position.set(0, y, -0.2 - (y - 0.42) * Math.tan(-backTilt));
    slat.rotation.x = backTilt;
    g.add(slat);
  }
  // Armrests on front posts.
  for (const side of [-0.24, 0.24]) {
    const arm = rounded(0.05, 0.03, 0.4, 0.012, woodMat);
    arm.position.set(side, 0.6, -0.03);
    g.add(arm);
    const post = cyl(0.016, 0.02, 0.18, woodMat, 10);
    post.position.set(side, 0.51, 0.14);
    g.add(post);
  }
  // Legs down to the runners, slightly splayed.
  for (const [x, z, lean] of [[-0.19, 0.16, 0.12], [0.19, 0.16, 0.12], [-0.19, -0.18, -0.12], [0.19, -0.18, -0.12]] as Array<[number, number, number]>) {
    const leg = cyl(0.018, 0.022, 0.36, dark, 10);
    leg.position.set(x, 0.24, z);
    leg.rotation.x = lean;
    g.add(leg);
  }
  // Curved runners: torus arcs centered at their lowest point, lying front-to-back.
  for (const side of [-0.21, 0.21]) {
    const runnerGeo = new THREE.TorusGeometry(0.5, 0.022, 8, 26, 1.15);
    runnerGeo.rotateZ(-Math.PI / 2 - 1.15 / 2);
    const runner = new THREE.Mesh(runnerGeo, dark);
    runner.rotation.y = Math.PI / 2;
    runner.position.set(side, 0.522, 0.02);
    g.add(runner);
  }
  shadow(g);
  return g;
}

// ------------------------------------------------------ tables & storage

function makeDiningTable(color: string): THREE.Group {
  const g = new THREE.Group();
  const top = rounded(1.4, 0.06, 0.85, 0.04, tint(wood(color)));
  top.position.y = 0.72;
  g.add(top);
  legSet(g, 1.3, 0.76, 0.7, 0.035, wood(WOOD_LIGHT));
  shadow(g);
  return g;
}

function makeLowBookcase(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const w = 1.2, h = 0.85, d = 0.28;
  const backPanel = box(w, h, 0.02, body);
  backPanel.position.set(0, h / 2, -d / 2 + 0.01);
  g.add(backPanel);
  for (const side of [-1, 0, 1]) {
    const panel = box(0.03, h, d, body);
    panel.position.set(side * (w / 2 - 0.015), h / 2, 0);
    g.add(panel);
  }
  for (let i = 0; i <= 2; i++) {
    const y = 0.04 + (i * (h - 0.08)) / 2;
    const plank = box(w - 0.04, 0.035, d, body);
    plank.position.set(0, y, 0);
    g.add(plank);
    if (i < 2) addBookRow(g, -w / 2 + 0.07, w / 2 - 0.07, y + 0.02, -0.02, i * 13);
  }
  shadow(g);
  return g;
}

function makeCubeStorage(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const w = 0.82, h = 0.82, d = 0.35, t = 0.03;
  const back = box(w, h, 0.02, body);
  back.position.set(0, h / 2 + 0.02, -d / 2 + 0.01);
  g.add(back);
  for (let i = 0; i <= 2; i++) {
    const v = box(t, h, d, body);
    v.position.set(-w / 2 + t / 2 + i * ((w - t) / 2), h / 2 + 0.02, 0);
    g.add(v);
    const hz = box(w, t, d, body);
    hz.position.set(0, 0.02 + t / 2 + i * ((h - t) / 2), 0);
    g.add(hz);
  }
  const binColors = ['#b0685e', '#7d9471'];
  for (const [ci, [cx, cy]] of ([[-0.2, 0.22], [0.2, 0.6]] as Array<[number, number]>).entries()) {
    const bin = box(0.3, 0.28, 0.28, fabric(binColors[ci]));
    bin.position.set(cx, cy, 0.01);
    g.add(bin);
  }
  shadow(g);
  return g;
}

function makeFilingCabinet(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(metal(color, 0.5));
  const cab = box(0.42, 0.72, 0.5, body);
  cab.position.y = 0.4;
  g.add(cab);
  for (let i = 0; i < 3; i++) {
    const front = box(0.36, 0.2, 0.02, metal('#9aa0a8', 0.45));
    front.position.set(0, 0.16 + i * 0.23, 0.26);
    g.add(front);
    const handle = box(0.14, 0.025, 0.03, metal('#3d3f45', 0.4));
    handle.position.set(0, 0.22 + i * 0.23, 0.275);
    g.add(handle);
  }
  const plinth = box(0.38, 0.08, 0.46, matte('#3d3f45', 0.7));
  plinth.position.y = 0.04;
  g.add(plinth);
  shadow(g);
  return g;
}

// ------------------------------------------------------ workspace

function makeDeskChair(color: string): THREE.Group {
  const g = new THREE.Group();
  const pad = tint(fabric(color));
  const seat = rounded(0.46, 0.09, 0.44, 0.05, pad);
  seat.position.y = 0.48;
  g.add(seat);
  const back = rounded(0.44, 0.52, 0.09, 0.05, pad);
  back.position.set(0, 0.82, -0.2);
  back.rotation.x = -0.08;
  g.add(back);
  const lift = cyl(0.025, 0.03, 0.32, metal(METAL_GREY), 12);
  lift.position.y = 0.3;
  g.add(lift);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = box(0.26, 0.03, 0.05, metal('#3d3f45', 0.5));
    arm.position.set(Math.cos(a) * 0.14, 0.08, Math.sin(a) * 0.14);
    arm.rotation.y = -a;
    g.add(arm);
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), matte('#26262a', 0.5));
    caster.position.set(Math.cos(a) * 0.26, 0.04, Math.sin(a) * 0.26);
    g.add(caster);
  }
  shadow(g);
  return g;
}

function screenMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 128, 80);
  grad.addColorStop(0, '#2b4a6b');
  grad.addColorStop(1, '#67a0b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 80);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(10, 10, 40, 6);
  ctx.fillRect(10, 24, 82, 4);
  ctx.fillRect(10, 34, 66, 4);
  ctx.fillRect(10, 44, 74, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: '#9fc4d8', emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.3 });
  mat.userData.screen = true;
  return mat;
}

function makeMonitor(color: string): THREE.Group {
  const g = new THREE.Group();
  const frame = tint(matte(color, 0.5));
  const panel = box(0.52, 0.32, 0.03, frame);
  panel.position.y = 0.36;
  g.add(panel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), screenMaterial());
  screen.position.set(0, 0.36, 0.017);
  g.add(screen);
  const stem = box(0.04, 0.16, 0.04, frame);
  stem.position.y = 0.12;
  g.add(stem);
  const foot = rounded(0.26, 0.03, 0.16, 0.02, frame);
  foot.position.y = 0.02;
  g.add(foot);
  shadow(g);
  return g;
}

function makeLaptop(color: string): THREE.Group {
  const g = new THREE.Group();
  const shell = tint(metal(color, 0.45));
  const base = box(0.34, 0.018, 0.24, shell);
  base.position.y = 0.01;
  g.add(base);
  const kb = box(0.3, 0.004, 0.18, matte('#2c2e33', 0.6));
  kb.position.set(0, 0.021, 0.01);
  g.add(kb);
  const lid = box(0.34, 0.22, 0.014, shell);
  lid.position.set(0, 0.11, -0.145);
  lid.rotation.x = -0.32;
  g.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), screenMaterial());
  screen.position.set(0, 0.11, -0.137);
  screen.rotation.x = -0.32;
  g.add(screen);
  shadow(g);
  return g;
}

function makeDesktopTower(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(matte(color, 0.5));
  const tower = box(0.2, 0.46, 0.42, body);
  tower.position.y = 0.23;
  g.add(tower);
  const facePlate = box(0.18, 0.42, 0.015, matte('#2c2e33', 0.55));
  facePlate.position.set(0, 0.23, 0.215);
  g.add(facePlate);
  const power = cyl(0.014, 0.014, 0.02, new THREE.MeshStandardMaterial({ color: '#7dd8a0', emissive: '#4fd884', emissiveIntensity: 0.9 }), 10);
  power.rotation.x = Math.PI / 2;
  power.position.set(0, 0.41, 0.225);
  g.add(power);
  for (let i = 0; i < 3; i++) {
    const vent = box(0.15, 0.012, 0.01, matte('#43454a', 0.6));
    vent.position.set(0, 0.1 + i * 0.04, 0.222);
    g.add(vent);
  }
  shadow(g);
  return g;
}

function makeKeyboardSet(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(matte(color, 0.55));
  const kb = rounded(0.4, 0.03, 0.14, 0.012, body);
  kb.position.y = 0.015;
  g.add(kb);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 12; c++) {
      const key = box(0.024, 0.012, 0.024, matte('#3a3c42', 0.6));
      key.position.set(-0.165 + c * 0.03, 0.035, -0.045 + r * 0.03);
      g.add(key);
    }
  }
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), body);
  mouse.scale.set(0.75, 0.5, 1.1);
  mouse.position.set(0.3, 0.022, 0);
  g.add(mouse);
  shadow(g);
  return g;
}

function makeSpeakers(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  for (const side of [-0.22, 0.22]) {
    const cab = box(0.24, 0.72, 0.24, body);
    cab.position.set(side, 0.36, 0);
    g.add(cab);
    const woofer = cyl(0.08, 0.08, 0.02, matte('#26262a', 0.5), 20);
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(side, 0.25, 0.125);
    g.add(woofer);
    const tweeter = cyl(0.04, 0.04, 0.02, matte('#3a3c42', 0.4), 16);
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(side, 0.52, 0.125);
    g.add(tweeter);
  }
  shadow(g);
  return g;
}

function makePrinter(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(matte(color, 0.55));
  const base = rounded(0.42, 0.16, 0.34, 0.03, body);
  base.position.y = 0.09;
  g.add(base);
  const top = rounded(0.36, 0.06, 0.28, 0.02, matte('#d8d4cc', 0.6));
  top.position.y = 0.2;
  g.add(top);
  const paper = box(0.24, 0.008, 0.16, matte('#f6f3ec', 0.9));
  paper.position.set(0, 0.235, -0.02);
  paper.rotation.x = -0.12;
  g.add(paper);
  const slot = box(0.3, 0.015, 0.02, matte('#2c2e33', 0.6));
  slot.position.set(0, 0.12, 0.175);
  g.add(slot);
  shadow(g);
  return g;
}

// ------------------------------------------------------ lighting extras

function makeFairyLights(color: string): THREE.Group {
  const g = new THREE.Group();
  const wire = matte('#5a5148', 0.8);
  const bulbMat = tint(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.4 }));
  const span = 1.6, sag = 0.16, n = 22;
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = new THREE.Vector3(-span / 2 + t * span, -Math.sin(t * Math.PI) * sag, 0);
    if (prev) {
      const seg = prev.clone().add(p).multiplyScalar(0.5);
      const len = prev.distanceTo(p);
      const wireSeg = cyl(0.005, 0.005, len, wire, 6);
      wireSeg.position.copy(seg);
      wireSeg.rotation.z = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI / 2;
      g.add(wireSeg);
    }
    if (i % 2 === 1) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), bulbMat);
      bulb.position.set(p.x, p.y - 0.03, p.z);
      g.add(bulb);
    }
    prev = p;
  }
  return g;
}

function makePaperLantern(color: string): THREE.Group {
  const g = new THREE.Group();
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 14),
    tint(new THREE.MeshStandardMaterial({ color, emissive: '#ffdfae', emissiveIntensity: 0.5, roughness: 0.9 }))
  );
  shade.scale.y = 0.85;
  shade.position.y = 0.17;
  g.add(shade);
  for (const y of [0.05, 0.29]) {
    const ring = cyl(0.05, 0.05, 0.02, matte('#8a5a3a', 0.7), 14);
    ring.position.y = y;
    g.add(ring);
  }
  const light = new THREE.PointLight('#ffd9a0', 1.6, 2, 1.8);
  light.position.y = 0.17;
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

function makeCandles(color: string): THREE.Group {
  const g = new THREE.Group();
  const wax = tint(matte(color, 0.6));
  const flameMat = new THREE.MeshStandardMaterial({ color: '#ffdf9e', emissive: '#ffb84a', emissiveIntensity: 2.2, roughness: 0.4 });
  const tray = cyl(0.14, 0.15, 0.02, metal('#c9a04a', 0.4), 20);
  tray.position.y = 0.01;
  g.add(tray);
  for (const [x, z, h] of [[-0.06, 0.03, 0.16], [0.05, -0.03, 0.11], [0.02, 0.07, 0.07]] as Array<[number, number, number]>) {
    const c = cyl(0.025, 0.028, h, wax, 12);
    c.position.set(x, 0.02 + h / 2, z);
    g.add(c);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 8), flameMat);
    flame.position.set(x, 0.04 + h, z);
    g.add(flame);
  }
  const light = new THREE.PointLight('#ffbe6a', 1.1, 1.6, 1.8);
  light.position.y = 0.25;
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

function makeLavaLamp(color: string): THREE.Group {
  const g = new THREE.Group();
  const metalBase = metal('#8f9299', 0.35);
  const base = cyl(0.05, 0.07, 0.08, metalBase, 16);
  base.position.y = 0.04;
  g.add(base);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.06, 0.22, 16),
    tint(new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.5, roughness: 0.15 }))
  );
  glass.position.y = 0.19;
  g.add(glass);
  const blobMat = new THREE.MeshStandardMaterial({ color: '#ff7ba9', emissive: '#ff5e96', emissiveIntensity: 1.3, roughness: 0.4 });
  for (const [y, r] of [[0.13, 0.028], [0.2, 0.02], [0.26, 0.016]] as Array<[number, number]>) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), blobMat);
    blob.position.set(0.004, y, 0);
    g.add(blob);
  }
  const cap = cyl(0.028, 0.038, 0.05, metalBase, 16);
  cap.position.y = 0.325;
  g.add(cap);
  const light = new THREE.PointLight('#ff7ba9', 0.9, 1.4, 1.8);
  light.position.y = 0.2;
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

// ------------------------------------------------------ toys & keepsakes

function makeTeddy(color: string): THREE.Group {
  const g = new THREE.Group();
  const fur = tint(fabric(color));
  const belly = matte('#e8d9c2', 0.9);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), fur);
  body.scale.set(1, 1.15, 0.85);
  body.position.y = 0.13;
  g.add(body);
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), belly);
  tummy.scale.set(1, 1.2, 0.5);
  tummy.position.set(0, 0.12, 0.06);
  g.add(tummy);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), fur);
  head.position.y = 0.3;
  g.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), belly);
  muzzle.position.set(0, 0.28, 0.06);
  g.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), matte('#3a2c22', 0.5));
  nose.position.set(0, 0.29, 0.09);
  g.add(nose);
  for (const side of [-0.06, 0.06]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), fur);
    ear.position.set(side, 0.37, 0);
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), matte('#2a2a2a', 0.4));
    eye.position.set(side * 0.45, 0.31, 0.07);
    g.add(eye);
    const armM = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), fur);
    armM.scale.set(0.8, 1.4, 0.8);
    armM.position.set(side * 1.9, 0.16, 0.02);
    armM.rotation.z = -side * 4;
    g.add(armM);
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), fur);
    leg.scale.set(0.9, 0.7, 1.3);
    leg.position.set(side * 1.4, 0.04, 0.05);
    g.add(leg);
  }
  shadow(g);
  return g;
}

function makeRadio(color: string): THREE.Group {
  const g = new THREE.Group();
  const shell = tint(matte(color, 0.55));
  const body = rounded(0.3, 0.18, 0.1, 0.025, shell);
  body.position.y = 0.1;
  g.add(body);
  for (let i = 0; i < 6; i++) {
    const grille = box(0.012, 0.12, 0.015, matte('#3a3227', 0.7));
    grille.position.set(-0.08 + i * 0.022, 0.1, 0.05);
    g.add(grille);
  }
  for (const x of [0.07, 0.11]) {
    const knob = cyl(0.016, 0.016, 0.02, metal('#c9a04a', 0.4), 12);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(x, 0.08, 0.055);
    g.add(knob);
  }
  const antenna = cyl(0.004, 0.004, 0.22, metal(METAL_GREY), 6);
  antenna.position.set(0.12, 0.28, -0.02);
  antenna.rotation.z = -0.35;
  g.add(antenna);
  shadow(g);
  return g;
}

function makeTrain(color: string): THREE.Group {
  const g = new THREE.Group();
  const paint = tint(matte(color, 0.6));
  const engine = box(0.16, 0.09, 0.09, paint);
  engine.position.set(-0.07, 0.08, 0);
  g.add(engine);
  const cab = box(0.08, 0.14, 0.09, wood(WOOD_LIGHT));
  cab.position.set(0.05, 0.11, 0);
  g.add(cab);
  const funnel = cyl(0.02, 0.025, 0.05, wood(WOOD_DARK), 10);
  funnel.position.set(-0.1, 0.15, 0);
  g.add(funnel);
  const car = box(0.12, 0.07, 0.08, wood(WOOD_LIGHT));
  car.position.set(0.22, 0.07, 0);
  g.add(car);
  for (const [x, z] of [[-0.1, 0.05], [-0.02, 0.05], [0.06, 0.05], [0.2, 0.05], [-0.1, -0.05], [-0.02, -0.05], [0.06, -0.05], [0.2, -0.05]] as Array<[number, number]>) {
    const wheel = cyl(0.025, 0.025, 0.02, matte('#3a2c22', 0.6), 12);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.03, z);
    g.add(wheel);
  }
  shadow(g);
  return g;
}

function makeCamera(color: string): THREE.Group {
  const g = new THREE.Group();
  const shell = tint(matte(color, 0.5));
  const body = rounded(0.18, 0.11, 0.07, 0.015, shell);
  body.position.y = 0.06;
  g.add(body);
  const lens = cyl(0.035, 0.04, 0.05, metal('#3a3c42', 0.35), 16);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.06, 0.05);
  g.add(lens);
  const glassEl = cyl(0.024, 0.024, 0.01, new THREE.MeshStandardMaterial({ color: '#3e63dd', roughness: 0.1, metalness: 0.4 }), 14);
  glassEl.rotation.x = Math.PI / 2;
  glassEl.position.set(0, 0.06, 0.076);
  g.add(glassEl);
  const button = cyl(0.012, 0.012, 0.012, metal('#c9a04a', 0.4), 10);
  button.position.set(0.06, 0.12, 0);
  g.add(button);
  const finder = box(0.04, 0.025, 0.03, matte('#3a3c42', 0.5));
  finder.position.set(-0.04, 0.125, 0);
  g.add(finder);
  shadow(g);
  return g;
}

function makeRecordPlayer(color: string): THREE.Group {
  const g = new THREE.Group();
  const shell = tint(wood(color));
  const base = rounded(0.4, 0.09, 0.34, 0.02, shell);
  base.position.y = 0.05;
  g.add(base);
  const disc = cyl(0.13, 0.13, 0.012, matte('#1e1e22', 0.35), 28);
  disc.position.set(-0.04, 0.1, 0);
  g.add(disc);
  const labelC = cyl(0.04, 0.04, 0.014, matte('#c96f4a', 0.6), 18);
  labelC.position.set(-0.04, 0.1, 0);
  g.add(labelC);
  const armBase = cyl(0.02, 0.02, 0.05, metal(METAL_GREY), 10);
  armBase.position.set(0.14, 0.12, -0.1);
  g.add(armBase);
  const arm = box(0.16, 0.012, 0.012, metal(METAL_GREY));
  arm.position.set(0.07, 0.14, -0.05);
  arm.rotation.y = 0.6;
  g.add(arm);
  shadow(g);
  return g;
}

function makeMusicBox(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const boxM = rounded(0.16, 0.08, 0.12, 0.012, body);
  boxM.position.y = 0.045;
  g.add(boxM);
  const lid = box(0.16, 0.015, 0.12, wood(WOOD_DARK));
  lid.position.set(0, 0.1, -0.045);
  lid.rotation.x = -1.1;
  g.add(lid);
  const dancer = cyl(0.012, 0.02, 0.05, matte('#e8b0c8', 0.6), 10);
  dancer.position.set(0, 0.11, 0.01);
  g.add(dancer);
  const dancerHead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), matte('#f2d8c8', 0.7));
  dancerHead.position.set(0, 0.145, 0.01);
  g.add(dancerHead);
  const crank = cyl(0.006, 0.006, 0.04, metal('#c9a04a', 0.4), 8);
  crank.rotation.z = Math.PI / 2;
  crank.position.set(0.1, 0.05, 0);
  g.add(crank);
  shadow(g);
  return g;
}

function makeSnowGlobe(color: string): THREE.Group {
  const g = new THREE.Group();
  const base = cyl(0.06, 0.07, 0.05, tint(wood(color)), 18);
  base.position.y = 0.025;
  g.add(base);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 18, 14),
    new THREE.MeshStandardMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.32, roughness: 0.08 })
  );
  globe.position.y = 0.11;
  g.add(globe);
  const house = box(0.035, 0.03, 0.03, matte('#b0685e', 0.7));
  house.position.y = 0.09;
  g.add(house);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.025, 4), matte('#6b4a2f', 0.7));
  roof.position.y = 0.117;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const snow = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
  for (const [x, y, z] of [[0.03, 0.13, 0.02], [-0.03, 0.15, -0.01], [0.01, 0.16, -0.03], [-0.02, 0.11, 0.03]] as Array<[number, number, number]>) {
    const flake = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 5), snow);
    flake.position.set(x, y, z);
    g.add(flake);
  }
  shadow(g);
  return g;
}

function globeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5e88b0';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#7d9c62';
  for (const [x, y, w, h] of [[8, 10, 26, 20], [30, 34, 18, 16], [58, 8, 30, 18], [66, 30, 22, 22], [102, 14, 16, 12], [98, 40, 20, 12]] as Array<[number, number, number, number]>) {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlobe(color: string): THREE.Group {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), new THREE.MeshStandardMaterial({ map: globeTexture(), roughness: 0.5 }));
  sphere.position.y = 0.19;
  sphere.rotation.z = 0.41;
  g.add(sphere);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.008, 8, 24, Math.PI), tint(metal(color, 0.4)));
  arc.position.y = 0.19;
  arc.rotation.z = 0.41 + Math.PI / 2;
  g.add(arc);
  const stem = cyl(0.012, 0.016, 0.06, tint(metal(color, 0.4)), 10);
  stem.position.y = 0.045;
  g.add(stem);
  const foot = cyl(0.05, 0.06, 0.02, tint(wood(WOOD_DARK)), 16);
  foot.position.y = 0.01;
  g.add(foot);
  shadow(g);
  return g;
}

function makeDollhouse(color: string): THREE.Group {
  const g = new THREE.Group();
  const walls = tint(matte(color, 0.75));
  const body = box(0.42, 0.3, 0.24, walls);
  body.position.y = 0.16;
  g.add(body);
  const roofL = box(0.26, 0.02, 0.28, matte('#8a5a3a', 0.7));
  roofL.position.set(-0.105, 0.37, 0);
  roofL.rotation.z = 0.62;
  g.add(roofL);
  const roofR = roofL.clone();
  roofR.position.x = 0.105;
  roofR.rotation.z = -0.62;
  g.add(roofR);
  const gable = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.14, 3), walls);
  gable.scale.z = 0.8;
  gable.position.y = 0.375;
  g.add(gable);
  const door = box(0.07, 0.12, 0.01, wood(WOOD_DARK));
  door.position.set(0, 0.08, 0.125);
  g.add(door);
  const winMat = new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffdf9e', emissiveIntensity: 0.5, roughness: 0.4 });
  for (const [x, y] of [[-0.12, 0.2], [0.12, 0.2], [-0.12, 0.09], [0.12, 0.09]] as Array<[number, number]>) {
    const win = box(0.06, 0.06, 0.01, winMat);
    win.position.set(x, y, 0.125);
    g.add(win);
  }
  shadow(g);
  return g;
}

// ------------------------------------------------------ plants & decor

function makeFern(color: string): THREE.Group {
  const g = new THREE.Group();
  const pot = cyl(0.12, 0.09, 0.18, tint(matte(color, 0.7)), 18);
  pot.position.y = 0.09;
  g.add(pot);
  const frondMat = matte('#4c8a52', 0.75);
  const frondGeo = new THREE.ConeGeometry(0.035, 0.34, 6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const lean = 0.7 + (i % 3) * 0.25;
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.set(Math.cos(a) * 0.07, 0.24, Math.sin(a) * 0.07);
    frond.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
    g.add(frond);
  }
  shadow(g);
  return g;
}

function makeMushroomPot(color: string): THREE.Group {
  const g = new THREE.Group();
  const pot = cyl(0.09, 0.07, 0.1, tint(matte(color, 0.7)), 16);
  pot.position.y = 0.05;
  g.add(pot);
  const soil = cyl(0.08, 0.08, 0.02, matte('#3a2c20', 0.95), 16);
  soil.position.y = 0.1;
  g.add(soil);
  for (const [x, z, h, r] of [[-0.02, 0.01, 0.1, 0.05], [0.04, -0.02, 0.07, 0.035], [0.01, 0.05, 0.05, 0.028]] as Array<[number, number, number, number]>) {
    const stem = cyl(0.012, 0.016, h, matte('#e8ddc8', 0.8), 8);
    stem.position.set(x, 0.1 + h / 2, z);
    g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), matte('#c0533f', 0.7));
    cap.position.set(x, 0.1 + h, z);
    g.add(cap);
    for (let d = 0; d < 3; d++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), matte('#f2ead9', 0.8));
      const da = d * 2.2 + x * 10;
      dot.position.set(x + Math.cos(da) * r * 0.55, 0.1 + h + r * 0.5, z + Math.sin(da) * r * 0.55);
      g.add(dot);
    }
  }
  shadow(g);
  return g;
}

/** Cheval mirror: oval glass swinging between two posts on splayed feet. */
function makeStandingMirror(color: string): THREE.Group {
  const g = new THREE.Group();
  const woodMat = tint(wood(color));
  const dark = wood(WOOD_DARK);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.028, 10, 32), woodMat);
  frame.scale.y = 1.4;
  frame.position.y = 0.97;
  frame.rotation.x = -0.08;
  g.add(frame);
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 28),
    new THREE.MeshStandardMaterial({ color: '#dfeef5', metalness: 0.3, roughness: 0.12, emissive: '#aebfc8', emissiveIntensity: 0.25 })
  );
  glass.scale.y = 1.4;
  glass.position.set(0, 0.97, 0.02);
  glass.rotation.x = -0.08;
  g.add(glass);
  // Wooden back panel so the mirror isn't a hollow hoop from behind.
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.265, 28), woodMat);
  back.scale.y = 1.4;
  back.position.set(0, 0.97, 0.012);
  back.rotation.set(-0.08, Math.PI, 0);
  g.add(back);
  for (const side of [-1, 1]) {
    const post = cyl(0.024, 0.028, 1.14, woodMat, 12);
    post.position.set(side * 0.36, 0.57, 0);
    g.add(post);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), woodMat);
    finial.position.set(side * 0.36, 1.16, 0);
    g.add(finial);
    // Pivot knob joining the frame to its post.
    const pivot = cyl(0.018, 0.018, 0.09, dark, 10);
    pivot.rotation.z = Math.PI / 2;
    pivot.position.set(side * 0.325, 0.97, 0);
    g.add(pivot);
    // Splayed foot running front-to-back under each post.
    const foot = rounded(0.055, 0.05, 0.4, 0.02, dark);
    foot.position.set(side * 0.36, 0.028, 0);
    g.add(foot);
  }
  const crossbar = cyl(0.018, 0.018, 0.66, dark, 10);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 0.24, 0);
  g.add(crossbar);
  shadow(g);
  return g;
}

function makeMantelClock(color: string): THREE.Group {
  const g = new THREE.Group();
  const bodyShape = rounded(0.2, 0.2, 0.08, 0.05, tint(wood(color)));
  bodyShape.position.y = 0.13;
  g.add(bodyShape);
  const plinth = box(0.24, 0.04, 0.1, wood(WOOD_DARK));
  plinth.position.y = 0.02;
  g.add(plinth);
  const face = cyl(0.07, 0.07, 0.02, matte('#f6f1e6', 0.6), 22);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0.14, 0.04);
  g.add(face);
  const handMat = matte('#2c2c2c', 0.5);
  const hour = box(0.008, 0.04, 0.008, handMat);
  hour.position.set(0.01, 0.155, 0.052);
  hour.rotation.z = -0.6;
  g.add(hour);
  const minute = box(0.006, 0.055, 0.008, handMat);
  minute.position.set(-0.01, 0.16, 0.054);
  minute.rotation.z = 0.5;
  g.add(minute);
  shadow(g);
  return g;
}

function makeBasket(color: string): THREE.Group {
  const g = new THREE.Group();
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    points.push(new THREE.Vector2(0.12 + t * 0.08, t * 0.24));
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 18), tint(new THREE.MeshStandardMaterial({ color, map: fabricTexture, roughness: 0.95 })));
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 22), wood(WOOD_LIGHT));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.24;
  g.add(rim);
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), fabric('#b0685e'));
  blanket.scale.y = 0.4;
  blanket.position.y = 0.22;
  g.add(blanket);
  shadow(g);
  return g;
}

function makeCushion(color: string): THREE.Group {
  const g = new THREE.Group();
  const pillow = rounded(0.34, 0.12, 0.34, 0.06, tint(fabric(color)));
  pillow.position.y = 0.07;
  pillow.rotation.y = 0.3;
  g.add(pillow);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), matte('#5a4a38', 0.8));
  button.position.y = 0.13;
  g.add(button);
  shadow(g);
  return g;
}

function makeFrameTrio(color: string): THREE.Group {
  const g = new THREE.Group();
  const frameMat = tint(wood(color));
  const artColors: Array<[string, string]> = [['#f5e6c8', '#c96f4a'], ['#d8e4da', '#4f8a58'], ['#e8ddc8', '#5e7a94']];
  for (const [i, [x, y, w, h]] of ([[-0.32, 0.05, 0.26, 0.34], [0.02, -0.02, 0.3, 0.24], [0.32, 0.06, 0.22, 0.28]] as Array<[number, number, number, number]>).entries()) {
    const frame = box(w, h, 0.03, frameMat);
    frame.position.set(x, y, 0);
    g.add(frame);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = artColors[i][0];
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = artColors[i][1];
    ctx.beginPath();
    if (i === 0) ctx.arc(32, 30, 15, 0, Math.PI * 2);
    else if (i === 1) { ctx.moveTo(8, 52); ctx.lineTo(30, 18); ctx.lineTo(44, 38); ctx.lineTo(58, 26); ctx.lineTo(58, 52); }
    else ctx.rect(16, 16, 32, 32);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const artMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    artMat.userData.art = true;
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), artMat);
    art.position.set(x, y, 0.016);
    g.add(art);
  }
  shadow(g);
  return g;
}

// ------------------------------------------------------ real-room pieces

/** BILLY-style bookcase: plinth, six-bay rhythm, pin holes; optional OXBERG glass doors. */
function makeBillyBookcase(color: string, glassDoors: boolean): THREE.Group {
  const g = new THREE.Group();
  const body = tint(wood(color));
  const w = 0.8, h = 2.02, d = 0.28;
  const plinth = box(w - 0.04, 0.08, d - 0.03, body);
  plinth.position.y = 0.04;
  g.add(plinth);
  const backPanel = box(w, h - 0.08, 0.015, body);
  backPanel.position.set(0, (h - 0.08) / 2 + 0.08, -d / 2 + 0.008);
  g.add(backPanel);
  for (const side of [-1, 1]) {
    const panel = box(0.025, h - 0.08, d, body);
    panel.position.set(side * (w / 2 - 0.0125), (h - 0.08) / 2 + 0.08, 0);
    g.add(panel);
    // Shelf-pin holes along the inner faces.
    for (let i = 0; i < 12; i++) {
      const pin = cyl(0.004, 0.004, 0.006, matte('#8f8577', 0.8), 6);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(side * (w / 2 - 0.028), 0.25 + i * 0.14, d / 4);
      g.add(pin);
    }
  }
  const top = box(w, 0.03, d, body);
  top.position.set(0, h - 0.015, 0);
  g.add(top);
  const bays = 5;
  for (let i = 0; i <= bays; i++) {
    const y = 0.1 + (i * (h - 0.22)) / bays;
    if (i > 0 && i < bays + 1) {
      const shelf = box(w - 0.05, 0.025, d - 0.02, body);
      shelf.position.set(0, y, 0);
      g.add(shelf);
    }
    if (i < bays) addBookRow(g, -w / 2 + 0.06, w / 2 - 0.06, y + 0.014, -0.03, i * 7);
  }
  if (glassDoors) {
    const frameMat = tint(wood(color));
    for (const side of [-1, 1]) {
      const doorW = w / 2 - 0.015;
      const cx = side * (w / 4);
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(doorW - 0.09, h - 0.2),
        new THREE.MeshStandardMaterial({ color: '#cfe0e8', transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide })
      );
      glass.position.set(cx, h / 2 + 0.02, d / 2 + 0.022);
      g.add(glass);
      for (const sy of [-1, 1]) {
        const rail = box(doorW, 0.07, 0.02, frameMat);
        rail.position.set(cx, h / 2 + 0.02 + sy * (h / 2 - 0.075), d / 2 + 0.02);
        g.add(rail);
      }
      for (const sx of [-1, 1]) {
        const stile = box(0.045, h - 0.06, 0.02, frameMat);
        stile.position.set(cx + sx * (doorW / 2 - 0.0225), h / 2 + 0.02, d / 2 + 0.02);
        g.add(stile);
      }
      const knob = cyl(0.011, 0.011, 0.025, metal(METAL_GREY), 8);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(cx - side * (doorW / 2 - 0.05), h / 2, d / 2 + 0.04);
      g.add(knob);
    }
  }
  shadow(g);
  return g;
}

function makeStandingDesk(color: string): THREE.Group {
  const g = new THREE.Group();
  const topY = 0.95;
  const top = rounded(1.6, 0.045, 0.75, 0.02, tint(wood(color)));
  top.position.y = topY;
  g.add(top);
  const legMat = matte('#f0ede6', 0.5);
  for (const side of [-0.62, 0.62]) {
    const upper = box(0.09, 0.42, 0.13, legMat);
    upper.position.set(side, 0.7, 0);
    g.add(upper);
    const lower = box(0.065, 0.46, 0.1, legMat);
    lower.position.set(side, 0.28, 0);
    g.add(lower);
    const foot = rounded(0.12, 0.035, 0.66, 0.015, matte('#d8d4cc', 0.55));
    foot.position.set(side, 0.02, 0);
    g.add(foot);
  }
  const crossbar = box(1.1, 0.06, 0.08, legMat);
  crossbar.position.set(0, 0.86, -0.25);
  g.add(crossbar);
  const controller = box(0.14, 0.03, 0.08, matte('#3a3c42', 0.55));
  controller.position.set(0.45, topY - 0.04, 0.3);
  g.add(controller);
  shadow(g);
  return g;
}

function perforatedTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f2f0ec';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(120,118,112,0.55)';
  for (let y = 6; y < 128; y += 9) {
    for (let x = 6 + (y % 18 === 6 ? 0 : 4); x < 128; x += 9) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function makeAirPurifier(color: string): THREE.Group {
  const g = new THREE.Group();
  const shellMat = tint(new THREE.MeshStandardMaterial({ color, map: perforatedTexture(), roughness: 0.6 }));
  const body = rounded(0.27, 0.5, 0.27, 0.05, shellMat);
  body.position.y = 0.27;
  g.add(body);
  const topRim = rounded(0.25, 0.25, 0.04, 0.04, matte('#e8e5df', 0.5));
  topRim.rotation.x = Math.PI / 2;
  topRim.position.y = 0.52;
  g.add(topRim);
  const grille = cyl(0.1, 0.1, 0.02, matte('#3a3c42', 0.55), 24);
  grille.position.y = 0.535;
  g.add(grille);
  for (let i = 1; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03 * i, 0.004, 6, 20), matte('#8f8c86', 0.5));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.547;
    g.add(ring);
  }
  const display = cyl(0.032, 0.032, 0.012, new THREE.MeshStandardMaterial({ color: '#2c2e33', emissive: '#4fd884', emissiveIntensity: 0.7, roughness: 0.3 }), 18);
  display.rotation.x = Math.PI / 2;
  display.position.set(0, 0.36, 0.135);
  g.add(display);
  shadow(g);
  return g;
}

function makeErgonomicChair(color: string): THREE.Group {
  const g = new THREE.Group();
  const frameMat = matte('#f0ede6', 0.5);
  const meshMat = tint(new THREE.MeshStandardMaterial({ color, map: fabricTexture, roughness: 0.85 }));
  const seat = rounded(0.46, 0.08, 0.44, 0.04, meshMat);
  seat.position.y = 0.5;
  g.add(seat);
  const backFrame = rounded(0.46, 0.68, 0.04, 0.03, frameMat);
  backFrame.position.set(0, 0.92, -0.24);
  backFrame.rotation.x = -0.12;
  g.add(backFrame);
  const meshBack = rounded(0.4, 0.6, 0.025, 0.03, meshMat);
  meshBack.position.set(0, 0.92, -0.225);
  meshBack.rotation.x = -0.12;
  g.add(meshBack);
  const headrest = rounded(0.3, 0.14, 0.05, 0.025, meshMat);
  headrest.position.set(0, 1.34, -0.28);
  headrest.rotation.x = -0.2;
  g.add(headrest);
  for (const side of [-0.26, 0.26]) {
    const armPost = box(0.03, 0.16, 0.03, frameMat);
    armPost.position.set(side, 0.56, 0.02);
    g.add(armPost);
    const armPad = rounded(0.07, 0.025, 0.24, 0.012, matte('#3a3c42', 0.6));
    armPad.position.set(side, 0.65, 0.02);
    g.add(armPad);
  }
  const lift = cyl(0.026, 0.032, 0.34, metal(METAL_GREY), 12);
  lift.position.y = 0.32;
  g.add(lift);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = box(0.28, 0.035, 0.05, frameMat);
    arm.position.set(Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15);
    arm.rotation.y = -a;
    g.add(arm);
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), matte('#26262a', 0.5));
    caster.position.set(Math.cos(a) * 0.28, 0.04, Math.sin(a) * 0.28);
    g.add(caster);
  }
  shadow(g);
  return g;
}

function makeUltrawideMonitor(color: string): THREE.Group {
  const g = new THREE.Group();
  const frame = tint(matte(color, 0.5));
  const panel = box(0.85, 0.34, 0.035, frame);
  panel.position.y = 0.4;
  g.add(panel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.81, 0.3), screenMaterial());
  screen.position.set(0, 0.4, 0.019);
  g.add(screen);
  const stem = box(0.06, 0.2, 0.05, frame);
  stem.position.set(0, 0.13, -0.04);
  g.add(stem);
  const foot = rounded(0.42, 0.03, 0.2, 0.02, frame);
  foot.position.y = 0.018;
  g.add(foot);
  shadow(g);
  return g;
}

function makeSoftboxLight(color: string): THREE.Group {
  const g = new THREE.Group();
  const dark = matte('#2c2e33', 0.55);
  // Tripod.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const leg = cyl(0.012, 0.014, 0.62, dark, 8);
    leg.position.set(Math.cos(a) * 0.17, 0.28, Math.sin(a) * 0.17);
    leg.rotation.z = Math.cos(a) * 0.5;
    leg.rotation.x = -Math.sin(a) * 0.5;
    g.add(leg);
  }
  const pole = cyl(0.016, 0.016, 0.9, dark, 10);
  pole.position.y = 0.9;
  g.add(pole);
  // Softbox panel, tilted gently downward.
  const head = new THREE.Group();
  head.position.set(0, 1.38, 0.02);
  head.rotation.x = -0.18;
  const shell = rounded(0.6, 0.44, 0.1, 0.03, dark);
  shell.position.z = -0.05;
  head.add(shell);
  const glowTint = tint(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.7 }));
  const diffuser = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), glowTint);
  diffuser.position.z = 0.005;
  head.add(diffuser);
  const gridMat = matte('#3a3c42', 0.7);
  for (let i = 1; i < 4; i++) {
    const vBar = box(0.008, 0.36, 0.008, gridMat);
    vBar.position.set(-0.26 + i * 0.13, 0, 0.01);
    head.add(vBar);
    if (i < 3) {
      const hBar = box(0.52, 0.008, 0.008, gridMat);
      hBar.position.set(0, -0.18 + i * 0.12, 0.01);
      head.add(hBar);
    }
  }
  g.add(head);
  const light = new THREE.PointLight('#fff4e0', 3.5, 4, 1.9);
  light.position.set(0, 1.35, 0.15);
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

function makeRadiator(color: string): THREE.Group {
  const g = new THREE.Group();
  const finMat = tint(matte(color, 0.45));
  const w = 0.9, h = 0.6;
  for (let i = 0; i < 9; i++) {
    const fin = rounded(0.075, h, 0.05, 0.02, finMat);
    fin.position.set(-w / 2 + 0.05 + i * 0.095, 0, 0.01);
    g.add(fin);
  }
  for (const sy of [-1, 1]) {
    const pipe = cyl(0.018, 0.018, w, metal(METAL_GREY), 10);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, sy * (h / 2 - 0.05), -0.02);
    g.add(pipe);
  }
  const valve = cyl(0.025, 0.025, 0.06, metal('#c9a04a', 0.4), 10);
  valve.position.set(w / 2 + 0.02, -h / 2 + 0.05, -0.02);
  valve.rotation.z = Math.PI / 2;
  g.add(valve);
  // Lift the whole radiator so its bottom rests slightly above the floor line.
  for (const child of g.children) child.position.y += h / 2 + 0.09;
  shadow(g);
  return g;
}

function makeWallAC(color: string): THREE.Group {
  const g = new THREE.Group();
  const shell = tint(matte(color, 0.45));
  const body = rounded(0.9, 0.28, 0.2, 0.06, shell);
  g.add(body);
  const vent = box(0.78, 0.05, 0.02, matte('#d8d4cc', 0.5));
  vent.position.set(0, -0.09, 0.1);
  vent.rotation.x = 0.5;
  g.add(vent);
  const led = box(0.05, 0.018, 0.01, new THREE.MeshStandardMaterial({ color: '#2c2e33', emissive: '#4fd884', emissiveIntensity: 0.8 }));
  led.position.set(0.32, -0.05, 0.101);
  g.add(led);
  const seam = box(0.86, 0.008, 0.01, matte('#d0ccc4', 0.5));
  seam.position.set(0, 0.05, 0.101);
  g.add(seam);
  shadow(g);
  return g;
}

function makeRollingDrawers(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = tint(matte(color, 0.55));
  const cab = rounded(0.42, 0.52, 0.5, 0.02, body);
  cab.position.y = 0.34;
  g.add(cab);
  for (let i = 0; i < 3; i++) {
    const front = box(0.36, 0.14, 0.015, matte('#f6f4f0', 0.5));
    front.position.set(0, 0.16 + i * 0.17, 0.258);
    g.add(front);
    const lip = box(0.3, 0.015, 0.02, matte('#c8c4bc', 0.5));
    lip.position.set(0, 0.225 + i * 0.17, 0.262);
    g.add(lip);
  }
  for (const [x, z] of [[-0.15, 0.19], [0.15, 0.19], [-0.15, -0.19], [0.15, -0.19]] as Array<[number, number]>) {
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), matte('#26262a', 0.5));
    caster.position.set(x, 0.045, z);
    g.add(caster);
  }
  shadow(g);
  return g;
}

// ------------------------------------------------------ doors & windows

function skyPaneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#aee0f5');
  grad.addColorStop(0.72, '#f5e2b8');
  grad.addColorStop(1, '#dff0d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, r] of [[24, 26, 9], [36, 22, 12], [50, 28, 8], [74, 48, 8], [84, 52, 10]] as Array<[number, number, number]>) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8fae72';
  ctx.beginPath();
  ctx.ellipse(30, 122, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(78, 126, 40, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glassPane(w: number, h: number): THREE.Mesh {
  const tex = skyPaneTexture();
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.25 })
  );
}

/** Casing rails + jambs around an opening, centered at origin. */
function addCasing(g: THREE.Group, w: number, h: number, mat: THREE.Material, thick = 0.07, depth = 0.06): void {
  const rail = box(w + thick * 2, thick, depth, mat);
  rail.position.y = h / 2 + thick / 2;
  g.add(rail);
  const bottom = rail.clone();
  bottom.position.y = -h / 2 - thick / 2;
  g.add(bottom);
  for (const side of [-1, 1]) {
    const jamb = box(thick, h + thick * 2, depth, mat);
    jamb.position.x = side * (w / 2 + thick / 2);
    g.add(jamb);
  }
}

function makeSunnyWindow(color: string): THREE.Group {
  const g = new THREE.Group();
  const frameMat = tint(wood(color));
  const w = 1.0, h = 1.2;
  addCasing(g, w, h, frameMat);
  const glass = glassPane(w, h);
  glass.position.z = 0.01;
  g.add(glass);
  const sashMat = matte('#f2ead9', 0.6);
  const hBar = box(w, 0.045, 0.04, sashMat);
  hBar.position.z = 0.025;
  g.add(hBar);
  const vBar = box(0.045, h, 0.04, sashMat);
  vBar.position.z = 0.025;
  g.add(vBar);
  const sill = box(w + 0.24, 0.05, 0.14, frameMat);
  sill.position.set(0, -h / 2 - 0.09, 0.04);
  g.add(sill);
  const pot = cyl(0.05, 0.04, 0.08, matte('#c96f4a', 0.7), 12);
  pot.position.set(-0.3, -h / 2 - 0.02, 0.06);
  g.add(pot);
  const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), matte('#4c8a52', 0.75));
  bush.position.set(-0.3, -h / 2 + 0.05, 0.06);
  g.add(bush);
  shadow(g);
  return g;
}

function makeCottageDoor(color: string): THREE.Group {
  const g = new THREE.Group();
  const w = 0.86, h = 2.0;
  addCasing(g, w, h, wood('#e8e0d0', 0.6), 0.08, 0.07);
  const slab = box(w, h, 0.05, tint(wood(color)));
  g.add(slab);
  // Recessed panels
  for (const [py, ph] of [[0.52, 0.72], [-0.5, 0.82]] as Array<[number, number]>) {
    for (const side of [-1, 1]) {
      const panel = box(w / 2 - 0.14, ph, 0.02, tint(wood(color)));
      panel.position.set(side * (w / 4 - 0.02), py, 0.032);
      g.add(panel);
    }
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), metal('#c9a04a', 0.3));
  knob.position.set(w / 2 - 0.1, -0.04, 0.06);
  g.add(knob);
  const plate = cyl(0.045, 0.045, 0.012, metal('#c9a04a', 0.4), 14);
  plate.rotation.x = Math.PI / 2;
  plate.position.set(w / 2 - 0.1, -0.04, 0.028);
  g.add(plate);
  shadow(g);
  return g;
}

function makeModernDoor(color: string): THREE.Group {
  const g = new THREE.Group();
  const w = 0.92, h = 2.05;
  addCasing(g, w, h, matte('#d8d4cc', 0.5), 0.06, 0.05);
  const slab = box(w, h, 0.05, tint(matte(color, 0.55)));
  g.add(slab);
  const frost = box(0.14, h - 0.4, 0.06, new THREE.MeshStandardMaterial({ color: '#dfe8ec', transparent: true, opacity: 0.55, roughness: 0.2 }));
  frost.position.set(-0.16, 0, 0);
  g.add(frost);
  const bar = cyl(0.015, 0.015, 0.62, metal(METAL_GREY, 0.3), 10);
  bar.position.set(w / 2 - 0.12, 0, 0.07);
  g.add(bar);
  for (const sy of [-0.24, 0.24]) {
    const standoff = cyl(0.011, 0.011, 0.045, metal(METAL_GREY, 0.3), 8);
    standoff.rotation.x = Math.PI / 2;
    standoff.position.set(w / 2 - 0.12, sy, 0.048);
    g.add(standoff);
  }
  shadow(g);
  return g;
}

function makeBarnDoor(color: string): THREE.Group {
  const g = new THREE.Group();
  const dark = metal('#3d3f45', 0.45);
  const doorW = 0.96, doorH = 1.92;
  // Exposed slider rail above the door.
  const rail = box(1.65, 0.05, 0.035, dark);
  rail.position.set(0, doorH / 2 + 0.11, 0.01);
  g.add(rail);
  for (const side of [-0.72, 0.72]) {
    const mount = cyl(0.02, 0.02, 0.03, dark, 8);
    mount.rotation.x = Math.PI / 2;
    mount.position.set(side, doorH / 2 + 0.11, 0.028);
    g.add(mount);
  }
  // The door hangs slightly slid to one side.
  const door = new THREE.Group();
  door.position.set(0.14, 0, 0.045);
  const plankMat = tint(wood(color));
  for (let i = 0; i < 5; i++) {
    const plank = box(0.182, doorH, 0.045, plankMat);
    plank.position.x = -doorW / 2 + 0.095 + i * 0.192;
    door.add(plank);
  }
  for (const sy of [-1, 1]) {
    const batten = box(doorW, 0.12, 0.02, plankMat);
    batten.position.set(0, sy * (doorH / 2 - 0.14), 0.033);
    door.add(batten);
  }
  const diag = box(1.62, 0.11, 0.02, plankMat);
  diag.position.z = 0.033;
  diag.rotation.z = Math.atan2(doorH - 0.4, doorW);
  door.add(diag);
  for (const side of [-0.24, 0.24]) {
    const hanger = box(0.05, 0.24, 0.018, dark);
    hanger.position.set(side, doorH / 2 - 0.02, 0.058);
    door.add(hanger);
    const wheel = cyl(0.05, 0.05, 0.028, dark, 14);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(side, doorH / 2 + 0.11, 0.058);
    door.add(wheel);
  }
  const handle = cyl(0.016, 0.016, 0.42, dark, 8);
  handle.position.set(-doorW / 2 + 0.12, -0.05, 0.075);
  door.add(handle);
  g.add(door);
  shadow(g);
  return g;
}

function makeArchedDoor(color: string): THREE.Group {
  const g = new THREE.Group();
  const w = 0.92, r = w / 2, hRect = 1.55;
  const yBot = -(hRect + r) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, yBot);
  shape.lineTo(w / 2, yBot);
  shape.lineTo(w / 2, yBot + hRect);
  shape.absarc(0, yBot + hRect, r, 0, Math.PI, false);
  shape.lineTo(-w / 2, yBot);
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }), tint(wood(color)));
  slab.position.z = -0.025;
  g.add(slab);
  const caseMat = wood('#e8e0d0', 0.6);
  for (const side of [-1, 1]) {
    const jamb = box(0.08, hRect + 0.02, 0.07, caseMat);
    jamb.position.set(side * (w / 2 + 0.04), yBot + hRect / 2, 0);
    g.add(jamb);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(r + 0.04, 0.042, 8, 26, Math.PI), caseMat);
  arch.position.set(0, yBot + hRect, 0);
  g.add(arch);
  const sill = box(w + 0.24, 0.06, 0.09, caseMat);
  sill.position.set(0, yBot + 0.02, 0.01);
  g.add(sill);
  // Iron strap hinges and ring handle.
  const iron = metal('#2f3136', 0.5);
  for (const hy of [yBot + 0.42, yBot + 1.28]) {
    const strap = box(0.3, 0.055, 0.015, iron);
    strap.position.set(-w / 2 + 0.17, hy, 0.033);
    g.add(strap);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.07, 4), iron);
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(-w / 2 + 0.35, hy, 0.033);
    g.add(tip);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 18), iron);
  ring.position.set(w / 2 - 0.16, yBot + 0.92, 0.05);
  ring.rotation.x = 0.4;
  g.add(ring);
  const mount = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), iron);
  mount.position.set(w / 2 - 0.16, yBot + 0.97, 0.035);
  g.add(mount);
  shadow(g);
  return g;
}

function makeDutchDoor(color: string): THREE.Group {
  const g = new THREE.Group();
  const w = 0.88, h = 2.0;
  addCasing(g, w, h, wood('#e8e0d0', 0.6), 0.08, 0.07);
  const slabMat = tint(wood(color));
  // Open top half shows the outdoors.
  const view = glassPane(w - 0.06, h / 2 - 0.02);
  view.position.set(0, h / 4, -0.02);
  g.add(view);
  // Closed bottom half with a little ledge shelf.
  const bottom = box(w, h / 2 - 0.02, 0.05, slabMat);
  bottom.position.set(0, -h / 4, 0);
  g.add(bottom);
  const panel = box(w - 0.24, h / 2 - 0.3, 0.02, slabMat);
  panel.position.set(0, -h / 4, 0.028);
  g.add(panel);
  const ledge = box(w + 0.08, 0.04, 0.1, wood('#e8e0d0', 0.6));
  ledge.position.set(0, 0.01, 0.045);
  g.add(ledge);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), metal('#c9a04a', 0.3));
  knob.position.set(w / 2 - 0.1, -0.12, 0.055);
  g.add(knob);
  // Top leaf swung into the room on its left hinge.
  const leaf = new THREE.Group();
  leaf.position.set(-w / 2 + 0.02, h / 4, 0.05);
  leaf.rotation.y = -1.0;
  const leafSlab = box(w - 0.04, h / 2 - 0.06, 0.045, slabMat);
  leafSlab.position.x = (w - 0.04) / 2;
  leaf.add(leafSlab);
  const leafPanel = box(w - 0.26, h / 2 - 0.28, 0.018, slabMat);
  leafPanel.position.set((w - 0.04) / 2, 0, 0.032);
  leaf.add(leafPanel);
  g.add(leaf);
  shadow(g);
  return g;
}

function makeBalconyDoors(color: string): THREE.Group {
  const g = new THREE.Group();
  const w = 1.5, h = 2.1;
  const frameMat = matte('#f2ead9', 0.55);
  addCasing(g, w, h, frameMat, 0.08, 0.07);
  for (const side of [-1, 1]) {
    const leafW = w / 2 - 0.02;
    const cx = side * (w / 4);
    // Leaf frame: stiles and rails around a tall glass pane.
    const glass = glassPane(leafW - 0.16, h - 0.2);
    glass.position.set(cx, 0, 0.012);
    g.add(glass);
    for (const sy of [-1, 1]) {
      const rail = box(leafW, 0.1, 0.045, frameMat);
      rail.position.set(cx, sy * (h / 2 - 0.05), 0.02);
      g.add(rail);
    }
    for (const sx of [-1, 1]) {
      const stile = box(0.08, h, 0.045, frameMat);
      stile.position.set(cx + sx * (leafW / 2 - 0.04), 0, 0.02);
      g.add(stile);
    }
    for (let i = 1; i < 3; i++) {
      const bar = box(leafW - 0.14, 0.035, 0.04, frameMat);
      bar.position.set(cx, -h / 2 + (i * h) / 3, 0.03);
      g.add(bar);
    }
    const handle = cyl(0.012, 0.012, 0.14, metal(METAL_GREY), 10);
    handle.position.set(side * 0.09, -0.05, 0.055);
    g.add(handle);
    // Sheer curtain gathered at the outer edge of each leaf.
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, h - 0.12),
      tint(new THREE.MeshStandardMaterial({ color, roughness: 0.92, transparent: true, opacity: 0.65, side: THREE.DoubleSide }))
    );
    curtain.position.set(side * (w / 2 - 0.1), 0.02, 0.07);
    curtain.rotation.y = side * 0.18;
    g.add(curtain);
  }
  const rod = cyl(0.016, 0.016, w + 0.4, wood(WOOD_DARK), 10);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, h / 2 + 0.14, 0.09);
  g.add(rod);
  shadow(g);
  return g;
}

/** Painted view through the open balcony door: sky, hills, railing, deck. */
function balconyViewTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, '#aee0f5');
  grad.addColorStop(0.8, '#f5e2b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 192, 160);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, r] of [[40, 38, 13], [58, 32, 16], [76, 40, 12], [140, 60, 11], [156, 64, 14]] as Array<[number, number, number]>) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8fae72';
  ctx.beginPath();
  ctx.ellipse(50, 168, 90, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(160, 172, 80, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // deck
  ctx.fillStyle = '#c9c2b4';
  ctx.fillRect(0, 196, 192, 60);
  ctx.strokeStyle = 'rgba(120,112,100,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(96 + (i - 2) * 22, 196);
    ctx.lineTo(96 + (i - 2) * 54, 256);
    ctx.stroke();
  }
  // railing silhouette
  ctx.fillStyle = '#6b655c';
  ctx.fillRect(0, 118, 192, 9);
  for (let x = 8; x < 192; x += 18) {
    ctx.fillRect(x, 127, 5, 74);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Balcony door: open French doors inside, real platform + railing outside the wall. */
function makeBalcony(color: string): THREE.Group {
  const g = new THREE.Group();
  const frameMat = matte('#f2ead9', 0.55);
  const railMat = tint(matte(color, 0.6));
  const w = 1.4, h = 2.05;
  addCasing(g, w, h, frameMat, 0.08, 0.07);
  const floorY = -h / 2 - 0.08;

  // View plate just behind the doorway: what you see through the opening.
  const viewTex = balconyViewTexture();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.04, h + 0.04),
    new THREE.MeshStandardMaterial({ map: viewTex, emissive: '#ffffff', emissiveMap: viewTex, emissiveIntensity: 0.42, roughness: 0.6 })
  );
  plate.position.set(0, -0.02, -0.02);
  g.add(plate);

  const leafW = w / 2 - 0.02;
  const buildLeaf = (): THREE.Group => {
    const leaf = new THREE.Group();
    const glass = glassPane(leafW - 0.16, h - 0.2);
    glass.position.set(leafW / 2, 0, 0);
    leaf.add(glass);
    for (const sy of [-1, 1]) {
      const rail = box(leafW, 0.1, 0.045, frameMat);
      rail.position.set(leafW / 2, sy * (h / 2 - 0.05), 0.005);
      leaf.add(rail);
    }
    for (const sx of [0.04, leafW - 0.04]) {
      const stile = box(0.08, h, 0.045, frameMat);
      stile.position.set(sx, 0, 0.005);
      leaf.add(stile);
    }
    for (let i = 1; i < 3; i++) {
      const bar = box(leafW - 0.14, 0.035, 0.04, frameMat);
      bar.position.set(leafW / 2, -h / 2 + (i * h) / 3, 0.012);
      leaf.add(bar);
    }
    return leaf;
  };
  // Left leaf swung open into the room; right leaf closed.
  const openLeaf = buildLeaf();
  openLeaf.position.set(-w / 2 + 0.02, 0, 0.045);
  openLeaf.rotation.y = -0.85;
  g.add(openLeaf);
  const closedLeaf = buildLeaf();
  closedLeaf.rotation.y = Math.PI;
  closedLeaf.position.set(w / 2 - 0.02, 0, 0.055);
  g.add(closedLeaf);
  const handle = cyl(0.012, 0.012, 0.14, metal(METAL_GREY), 10);
  handle.position.set(0.09, -0.05, 0.09);
  g.add(handle);

  // ---- the balcony itself, outside the wall ----
  const platW = w + 0.55, platD = 0.95;
  const platTop = floorY + 0.16;
  const slab = box(platW, 0.16, platD, matte('#d8d4cc', 0.7));
  slab.position.set(0, floorY + 0.08, -0.09 - platD / 2);
  g.add(slab);
  const fascia = box(platW - 0.04, 0.05, platD - 0.04, matte('#b8b2a6', 0.7));
  fascia.position.set(0, floorY + 0.026, -0.09 - platD / 2);
  g.add(fascia);

  const railH = 0.95;
  const addRailRun = (x0: number, z0: number, x1: number, z1: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const rotY = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    const top = box(len, 0.05, 0.05, railMat);
    top.position.set(cx, platTop + railH, cz);
    top.rotation.y = rotY;
    g.add(top);
    const bottom = box(len, 0.035, 0.035, railMat);
    bottom.position.set(cx, platTop + 0.09, cz);
    bottom.rotation.y = rotY;
    g.add(bottom);
    const n = Math.max(2, Math.round(len / 0.15));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bal = cyl(0.012, 0.012, railH - 0.1, railMat, 6);
      bal.position.set(x0 + (x1 - x0) * t, platTop + railH / 2, z0 + (z1 - z0) * t);
      g.add(bal);
    }
  };
  const zOut = -0.09 - platD + 0.05;
  const xEdge = platW / 2 - 0.05;
  addRailRun(-xEdge, zOut, xEdge, zOut);
  addRailRun(-xEdge, -0.12, -xEdge, zOut);
  addRailRun(xEdge, -0.12, xEdge, zOut);

  // Corner planters with little bushes.
  for (const side of [-1, 1]) {
    const pot = box(0.16, 0.14, 0.16, matte('#c96f4a', 0.7));
    pot.position.set(side * (xEdge - 0.14), platTop + 0.07, zOut + 0.15);
    g.add(pot);
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), matte('#4c8a52', 0.75));
    bush.position.set(side * (xEdge - 0.14), platTop + 0.2, zOut + 0.15);
    g.add(bush);
  }
  shadow(g);
  return g;
}

// ------------------------------------------------------ seasonal pack

function makeBirthdayCake(color: string): THREE.Group {
  const g = new THREE.Group();
  const plate = cyl(0.16, 0.17, 0.015, matte('#f2f0ec', 0.4), 22);
  plate.position.y = 0.008;
  g.add(plate);
  const tier1 = cyl(0.13, 0.13, 0.09, tint(matte(color, 0.7)), 22);
  tier1.position.y = 0.06;
  g.add(tier1);
  const tier2 = cyl(0.085, 0.085, 0.08, tint(matte(color, 0.7)), 20);
  tier2.position.y = 0.145;
  g.add(tier2);
  for (const [r, y] of [[0.13, 0.105], [0.085, 0.185]] as Array<[number, number]>) {
    const frosting = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 8, 22), matte('#f6f1e6', 0.6));
    frosting.rotation.x = Math.PI / 2;
    frosting.position.y = y;
    g.add(frosting);
  }
  const flameMat = new THREE.MeshStandardMaterial({ color: '#ffdf9e', emissive: '#ffb84a', emissiveIntensity: 2, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const candle = cyl(0.008, 0.008, 0.05, matte(['#e8b0c8', '#a8c0cc', '#c9e0a0'][i], 0.6), 8);
    candle.position.set(Math.cos(a) * 0.045, 0.21, Math.sin(a) * 0.045);
    g.add(candle);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 6), flameMat);
    flame.position.set(Math.cos(a) * 0.045, 0.245, Math.sin(a) * 0.045);
    g.add(flame);
  }
  shadow(g);
  return g;
}

function makeBalloons(color: string): THREE.Group {
  const g = new THREE.Group();
  const weight = box(0.08, 0.05, 0.08, matte('#8f8c86', 0.6));
  weight.position.y = 0.025;
  g.add(weight);
  const tones = [color, '#7ea8b8', '#c9a04a'];
  for (const [i, [dx, dz, h]] of ([[-0.12, 0.03, 1.35], [0.02, -0.08, 1.5], [0.13, 0.06, 1.42]] as Array<[number, number, number]>).entries()) {
    const string = cyl(0.003, 0.003, h, matte('#b8b2a6', 0.8), 5);
    string.position.set(dx / 2, h / 2 + 0.04, dz / 2);
    string.rotation.z = -dx * 0.12;
    g.add(string);
    const mat = i === 0 ? tint(matte(tones[i], 0.35)) : matte(tones[i], 0.35);
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), mat);
    balloon.scale.y = 1.18;
    balloon.position.set(dx, h + 0.12, dz);
    g.add(balloon);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 8), mat);
    knot.rotation.x = Math.PI;
    knot.position.set(dx, h - 0.03, dz);
    g.add(knot);
  }
  shadow(g);
  return g;
}

function makeBunting(color: string): THREE.Group {
  const g = new THREE.Group();
  const span = 1.7, sag = 0.18;
  const string = matte('#8f8577', 0.8);
  const tones = [color, '#7ea8b8', '#c9a04a', '#7d9471'];
  let prev: THREE.Vector3 | null = null;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const p = new THREE.Vector3(-span / 2 + t * span, -Math.sin(t * Math.PI) * sag, 0);
    if (prev) {
      const seg = prev.clone().add(p).multiplyScalar(0.5);
      const wire = cyl(0.004, 0.004, prev.distanceTo(p), string, 5);
      wire.position.copy(seg);
      wire.rotation.z = Math.atan2(p.y - prev.y, p.x - prev.x) + Math.PI / 2;
      g.add(wire);
    }
    if (i % 2 === 1) {
      const flagShape = new THREE.Shape();
      flagShape.moveTo(-0.05, 0);
      flagShape.lineTo(0.05, 0);
      flagShape.lineTo(0, -0.11);
      flagShape.lineTo(-0.05, 0);
      const mat = i === 1 ? tint(matte(color, 0.75)) : matte(tones[(i >> 1) % tones.length], 0.75);
      const flag = new THREE.Mesh(new THREE.ExtrudeGeometry(flagShape, { depth: 0.006, bevelEnabled: false }), mat);
      flag.position.set(p.x, p.y - 0.005, -0.003);
      g.add(flag);
    }
    prev = p;
  }
  return g;
}

function makeGiftStack(color: string): THREE.Group {
  const g = new THREE.Group();
  const specs: Array<[number, number, number, number, number, string | null]> = [
    [0.3, 0.16, 0.24, 0, 0, null],
    [0.2, 0.13, 0.18, 0.02, 0.25, '#7ea8b8'],
    [0.12, 0.1, 0.12, -0.03, 0.5, '#c9a04a'],
  ];
  let y = 0;
  for (const [w, h, d, dx, rot, fixed] of specs) {
    const mat = fixed ? matte(fixed, 0.6) : tint(matte(color, 0.6));
    const gift = box(w, h, d, mat);
    gift.position.set(dx, y + h / 2, 0);
    gift.rotation.y = rot;
    g.add(gift);
    const ribbonMat = matte('#f2ead9', 0.5);
    const r1 = box(w + 0.006, h + 0.006, 0.03, ribbonMat);
    r1.position.copy(gift.position);
    r1.rotation.y = rot;
    g.add(r1);
    const r2 = box(0.03, h + 0.006, d + 0.006, ribbonMat);
    r2.position.copy(gift.position);
    r2.rotation.y = rot;
    g.add(r2);
    y += h;
  }
  const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(0.028, 0.01, 32, 6), matte('#f2ead9', 0.5));
  bow.position.set(-0.03, y + 0.02, 0);
  g.add(bow);
  shadow(g);
  return g;
}

function makeFestiveTree(color: string): THREE.Group {
  const g = new THREE.Group();
  const pot = cyl(0.14, 0.11, 0.14, tint(matte(color, 0.7)), 16);
  pot.position.y = 0.07;
  g.add(pot);
  const trunk = cyl(0.03, 0.04, 0.2, wood(WOOD_DARK), 8);
  trunk.position.y = 0.2;
  g.add(trunk);
  const leaves = matte('#3d6642', 0.8);
  const baubleMat = new THREE.MeshStandardMaterial({ color: '#c94f4f', emissive: '#c94f4f', emissiveIntensity: 0.5, roughness: 0.3 });
  const bauble2 = new THREE.MeshStandardMaterial({ color: '#c9a04a', emissive: '#c9a04a', emissiveIntensity: 0.5, roughness: 0.3 });
  let bi = 0;
  for (const [r, h, y] of [[0.42, 0.5, 0.5], [0.34, 0.45, 0.82], [0.24, 0.4, 1.12]] as Array<[number, number, number]>) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), leaves);
    cone.position.y = y;
    g.add(cone);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + y;
      const bauble = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), bi++ % 2 ? baubleMat : bauble2);
      bauble.position.set(Math.cos(a) * r * 0.75, y - h * 0.15, Math.sin(a) * r * 0.75);
      g.add(bauble);
    }
  }
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.06),
    new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffd24a', emissiveIntensity: 1.4, roughness: 0.3 })
  );
  star.position.y = 1.4;
  g.add(star);
  const light = new THREE.PointLight('#ffd9a0', 1.8, 3, 1.8);
  light.position.y = 0.9;
  g.add(light);
  g.userData.lamp = light;
  shadow(g);
  return g;
}

function makeWreath(color: string): THREE.Group {
  const g = new THREE.Group();
  const ringMat = matte('#3d6642', 0.85);
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 10, 24), ringMat);
  g.add(wreath);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), matte('#c94f4f', 0.5));
    berry.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0.05);
    g.add(berry);
  }
  const bow = box(0.12, 0.06, 0.03, tint(matte(color, 0.55)));
  bow.position.set(0, -0.18, 0.05);
  g.add(bow);
  for (const side of [-1, 1]) {
    const loop = box(0.06, 0.05, 0.025, tint(matte(color, 0.55)));
    loop.position.set(side * 0.07, -0.16, 0.045);
    loop.rotation.z = side * 0.5;
    g.add(loop);
  }
  shadow(g);
  return g;
}

function makePumpkin(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), tint(matte(color, 0.65)));
  body.scale.y = 0.78;
  body.position.y = 0.125;
  g.add(body);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 18), tint(matte(color, 0.7)));
    rib.scale.y = 0.78;
    rib.position.y = 0.125;
    rib.rotation.y = a;
    g.add(rib);
  }
  const stem = cyl(0.02, 0.03, 0.07, matte('#5d7d4a', 0.8), 8);
  stem.position.y = 0.27;
  stem.rotation.z = 0.15;
  g.add(stem);
  shadow(g);
  return g;
}

// ---------------------------------------------------------------- registry

const WOODS = ['#b98a5e', '#6b4a2f', '#e0d4bd', '#3d3f45'];
const FABRICS = ['#7d9471', '#b0685e', '#5e7a94', '#c9b48a', '#8a7a9e'];
const POTS = ['#c96f4a', '#e0d4bd', '#5e7a94'];

export const CATALOG: ItemDef[] = [
  // Seating
  { id: 'sofa', name: 'Sofa', cat: 'Seating', colors: FABRICS, make: makeSofa },
  { id: 'corner-sofa', name: 'Corner Sofa', cat: 'Seating', colors: FABRICS, make: makeCornerSofa },
  { id: 'armchair', name: 'Armchair', cat: 'Seating', colors: ['#b0685e', '#7d9471', '#5e7a94', '#c9a04a'], make: makeArmchair },
  { id: 'chair', name: 'Sunday Chair', cat: 'Seating', colors: ['#b98a5e', '#6b4a2f', '#3d3f45', '#8a5a3a'], make: makeChair },
  { id: 'rocking-chair', name: 'Rocking Chair', cat: 'Seating', colors: WOODS, make: makeRockingChair },
  { id: 'ottoman', name: 'Floor Pouffe', cat: 'Seating', colors: FABRICS, make: makeOttoman, surface: true },
  { id: 'cushion', name: 'Patchwork Cushion', cat: 'Seating', colors: FABRICS, make: makeCushion, stackable: true },
  // Beds
  { id: 'bed', name: 'Cozy Bed', cat: 'Beds', colors: ['#7d9471', '#b0685e', '#5e7a94', '#c9b48a'], make: makeBed },
  { id: 'canopy-bed', name: 'Storybook Canopy', cat: 'Beds', colors: ['#b0685e', '#7d9471', '#8a7a9e', '#c9b48a'], make: makeCanopyBed },
  // Tables
  { id: 'desk', name: 'Writing Desk', cat: 'Tables', colors: ['#b98a5e', '#6b4a2f', '#e0d4bd'], make: makeDesk, surface: true },
  { id: 'dining-table', name: 'Birch Table', cat: 'Tables', colors: ['#e0d4bd', '#b98a5e', '#6b4a2f'], make: makeDiningTable, surface: true },
  { id: 'coffee-table', name: 'Coffee Table', cat: 'Tables', colors: ['#b98a5e', '#6b4a2f', '#3d3f45'], make: makeCoffeeTable, surface: true },
  { id: 'side-table', name: 'Side Table', cat: 'Tables', colors: ['#b98a5e', '#6b4a2f', '#e0d4bd'], make: makeSideTable, surface: true },
  { id: 'nightstand', name: 'Bedside Table', cat: 'Tables', colors: WOODS, make: makeNightstand, surface: true },
  // Storage
  { id: 'bookshelf', name: 'Tall Bookcase', cat: 'Storage', colors: WOODS, make: makeBookshelf, surface: true },
  { id: 'billy', name: 'BILLY Bookcase', cat: 'Storage', colors: ['#eeeae0', '#b98a5e', '#6b4a2f', '#3d3f45'], make: (c) => makeBillyBookcase(c, false), surface: true },
  { id: 'billy-oxberg', name: 'BILLY / OXBERG Glass Doors', cat: 'Storage', colors: ['#eeeae0', '#b98a5e', '#6b4a2f', '#3d3f45'], make: (c) => makeBillyBookcase(c, true), surface: true },
  { id: 'low-bookcase', name: 'Low Bookcase', cat: 'Storage', colors: WOODS, make: makeLowBookcase, surface: true },
  { id: 'cube-storage', name: 'Cube Storage', cat: 'Storage', colors: ['#e0d4bd', '#b98a5e', '#3d3f45'], make: makeCubeStorage, surface: true },
  { id: 'wardrobe', name: 'Sunday Wardrobe', cat: 'Storage', colors: ['#b98a5e', '#6b4a2f', '#e0d4bd'], make: makeWardrobe },
  { id: 'dresser', name: 'Mirror Dresser', cat: 'Storage', colors: ['#b98a5e', '#6b4a2f', '#e0d4bd'], make: makeDresser, surface: true },
  { id: 'toybox', name: 'Old Toy Chest', cat: 'Storage', colors: ['#8a5a3a', '#b0685e', '#5e7a94'], make: makeToybox, surface: true },
  { id: 'basket', name: 'Woven Basket', cat: 'Storage', colors: ['#c9b48a', '#b8907a', '#8a7a9e'], make: makeBasket },
  { id: 'filing-cabinet', name: 'Filing Cabinet', cat: 'Storage', colors: ['#8f9299', '#5e7a94', '#3d3f45'], make: makeFilingCabinet, surface: true },
  // Workspace
  { id: 'desk-chair', name: 'Rolling Desk Chair', cat: 'Workspace', colors: ['#3d3f45', '#b0685e', '#7d9471'], make: makeDeskChair },
  { id: 'standing-desk', name: 'Bamboo Standing Desk', cat: 'Workspace', colors: ['#d8b98a', '#b98a5e', '#e0d4bd'], make: makeStandingDesk, surface: true },
  { id: 'air-purifier', name: 'Air Purifier', cat: 'Workspace', colors: ['#f2f0ec', '#d8d4cc', '#3d3f45'], make: makeAirPurifier },
  { id: 'ergo-chair', name: 'Mesh Ergonomic Chair', cat: 'Workspace', colors: ['#2c2e33', '#5e7a94', '#7d9471'], make: makeErgonomicChair },
  { id: 'ultrawide', name: 'Ultrawide Monitor', cat: 'Workspace', colors: ['#2c2e33', '#e0d4bd'], make: makeUltrawideMonitor, stackable: true },
  { id: 'softbox', name: 'Grid Softbox Light', cat: 'Workspace', colors: ['#fff2dc', '#e8b0c8', '#a8c0cc'], make: makeSoftboxLight },
  { id: 'rolling-drawers', name: 'Rolling Drawer Unit', cat: 'Workspace', colors: ['#f2f0ec', '#d8d4cc', '#5e7a94'], make: makeRollingDrawers, surface: true },
  { id: 'radiator', name: 'Wall Radiator', cat: 'Wall', colors: ['#f2f0ec', '#d8d4cc', '#b0685e'], make: makeRadiator, wall: true, floorWall: true },
  { id: 'wall-ac', name: 'Wall Air Conditioner', cat: 'Wall', colors: ['#f2f0ec', '#d8d4cc'], make: makeWallAC, wall: true },
  { id: 'monitor', name: 'Computer Monitor', cat: 'Workspace', colors: ['#2c2e33', '#e0d4bd'], make: makeMonitor, stackable: true },
  { id: 'laptop', name: 'Open Laptop', cat: 'Workspace', colors: ['#9aa0a8', '#2c2e33', '#e0d4bd'], make: makeLaptop, stackable: true },
  { id: 'desktop', name: 'Desktop Computer', cat: 'Workspace', colors: ['#2c2e33', '#9aa0a8', '#e0d4bd'], make: makeDesktopTower, stackable: true },
  { id: 'keyboard', name: 'Keyboard & Mouse', cat: 'Workspace', colors: ['#e0d4bd', '#2c2e33', '#9aa0a8'], make: makeKeyboardSet, stackable: true },
  { id: 'speakers', name: 'Stereo Speakers', cat: 'Workspace', colors: WOODS, make: makeSpeakers },
  { id: 'printer', name: 'Home Printer', cat: 'Workspace', colors: ['#e0d4bd', '#2c2e33', '#9aa0a8'], make: makePrinter, stackable: true },
  // Decor
  { id: 'books', name: 'Story Books', cat: 'Decor', colors: ['#a24a3f', '#3f6ba2', '#7a5aa0'], make: makeBookStack, stackable: true },
  { id: 'vase', name: 'Jam-jar Flowers', cat: 'Decor', colors: ['#7ea8b8', '#e0d4bd', '#c96f4a'], make: makeVase, stackable: true },
  { id: 'standing-mirror', name: 'Standing Mirror', cat: 'Decor', colors: WOODS, make: makeStandingMirror },
  { id: 'mantel-clock', name: 'Mantel Clock', cat: 'Decor', colors: WOODS, make: makeMantelClock, stackable: true },
  { id: 'globe', name: 'Schoolroom Globe', cat: 'Decor', colors: ['#c9a04a', '#8f9299', '#6b4a2f'], make: makeGlobe, stackable: true },
  { id: 'snow-globe', name: 'Snow Globe', cat: 'Decor', colors: WOODS, make: makeSnowGlobe, stackable: true },
  { id: 'camera', name: 'Holiday Camera', cat: 'Decor', colors: ['#3a3c42', '#b0685e', '#c9b48a'], make: makeCamera, stackable: true },
  { id: 'record-player', name: 'Record Player', cat: 'Decor', colors: WOODS, make: makeRecordPlayer, stackable: true },
  { id: 'radio', name: 'Pocket Radio', cat: 'Decor', colors: ['#c96f4a', '#7ea8b8', '#c9b48a'], make: makeRadio, stackable: true },
  { id: 'music-box', name: 'Music Box', cat: 'Decor', colors: WOODS, make: makeMusicBox, stackable: true },
  // Toys
  { id: 'teddy', name: 'Old Teddy', cat: 'Toys', colors: ['#b8907a', '#8a7a9e', '#c9b48a'], make: makeTeddy, stackable: true },
  { id: 'train', name: 'Wooden Train', cat: 'Toys', colors: ['#a24a3f', '#3f6ba2', '#4f8a58'], make: makeTrain, stackable: true },
  { id: 'dollhouse', name: 'Tiny Dollhouse', cat: 'Toys', colors: ['#e8c8b8', '#c9b48a', '#a8c0cc'], make: makeDollhouse, stackable: true },
  // Lighting
  { id: 'floor-lamp', name: 'Floor Lamp', cat: 'Lighting', colors: ['#e8dcc2', '#b0685e', '#5e7a94'], make: makeFloorLamp },
  { id: 'table-lamp', name: 'Honey Lamp', cat: 'Lighting', colors: ['#e8dcc2', '#b0685e', '#7d9471'], make: makeTableLamp, stackable: true },
  { id: 'paper-lantern', name: 'Paper Lantern', cat: 'Lighting', colors: ['#f2e3c2', '#e8b0c8', '#a8c0cc'], make: makePaperLantern, stackable: true },
  { id: 'candles', name: 'Candle Trio', cat: 'Lighting', colors: ['#f2e3c2', '#b0685e', '#7d9471'], make: makeCandles, stackable: true },
  { id: 'lava-lamp', name: 'Dreamy Lava Lamp', cat: 'Lighting', colors: ['#7ea8b8', '#8a7a9e', '#c9a04a'], make: makeLavaLamp, stackable: true },
  { id: 'fairy-lights', name: 'Fairy Lights', cat: 'Lighting', colors: ['#ffd98a', '#e8b0c8', '#a8c0cc'], make: makeFairyLights, wall: true },
  // Plants
  { id: 'plant', name: 'Big-leaf Plant', cat: 'Plants', colors: POTS, make: makePlant },
  { id: 'small-plant', name: 'Button Cactus', cat: 'Plants', colors: POTS, make: makeSmallPlant, stackable: true },
  { id: 'fern', name: 'Window Fern', cat: 'Plants', colors: POTS, make: makeFern, stackable: true },
  { id: 'mushroom-pot', name: 'Mushroom Pot', cat: 'Plants', colors: POTS, make: makeMushroomPot, stackable: true },
  // Rugs
  { id: 'round-rug', name: 'Round Braided Rug', cat: 'Rugs', colors: ['#b8907a', '#7d9471', '#5e7a94', '#a8788a'], make: makeRoundRug, rug: true },
  { id: 'rect-rug', name: 'Area Rug', cat: 'Rugs', colors: ['#b8907a', '#7d9471', '#5e7a94', '#a8788a'], make: makeRectRug, rug: true },
  // Seasonal
  { id: 'cake', name: 'Birthday Cake', cat: 'Seasonal', colors: ['#e8b0c8', '#7ea8b8', '#c9e0a0'], make: makeBirthdayCake, stackable: true },
  { id: 'balloons', name: 'Balloon Bunch', cat: 'Seasonal', colors: ['#e8b0c8', '#c94f4f', '#7ea8b8'], make: makeBalloons },
  { id: 'bunting', name: 'Party Bunting', cat: 'Seasonal', colors: ['#e8b0c8', '#c94f4f', '#7d9471'], make: makeBunting, wall: true },
  { id: 'gifts', name: 'Gift Stack', cat: 'Seasonal', colors: ['#b0685e', '#7d9471', '#5e7a94'], make: makeGiftStack, stackable: true },
  { id: 'festive-tree', name: 'Festive Tree', cat: 'Seasonal', colors: ['#c96f4a', '#b0685e', '#5e7a94'], make: makeFestiveTree },
  { id: 'wreath', name: 'Door Wreath', cat: 'Seasonal', colors: ['#c94f4f', '#c9a04a', '#5e7a94'], make: makeWreath, wall: true },
  { id: 'pumpkin', name: 'Plump Pumpkin', cat: 'Seasonal', colors: ['#d0793a', '#c9a04a', '#e8e0d0'], make: makePumpkin, stackable: true },
  // Wall
  { id: 'window', name: 'Sunny Window', cat: 'Wall', colors: ['#e8e0d0', '#b98a5e', '#6b4a2f'], make: makeSunnyWindow, wall: true },
  { id: 'door', name: 'Cottage Door', cat: 'Wall', colors: ['#b98a5e', '#6b4a2f', '#7d9471', '#5e7a94'], make: makeCottageDoor, wall: true, floorWall: true },
  { id: 'modern-door', name: 'Modern Door', cat: 'Wall', colors: ['#3d3f45', '#e0d4bd', '#5e7a94', '#b0685e'], make: makeModernDoor, wall: true, floorWall: true },
  { id: 'barn-door', name: 'Sliding Barn Door', cat: 'Wall', colors: ['#8a5a3a', '#b98a5e', '#6b4a2f'], make: makeBarnDoor, wall: true, floorWall: true },
  { id: 'arched-door', name: 'Arched Door', cat: 'Wall', colors: ['#6b4a2f', '#8a5a3a', '#7d9471'], make: makeArchedDoor, wall: true, floorWall: true },
  { id: 'dutch-door', name: 'Dutch Door', cat: 'Wall', colors: ['#7d9471', '#b0685e', '#5e7a94', '#e0d4bd'], make: makeDutchDoor, wall: true, floorWall: true },
  { id: 'balcony-doors', name: 'Balcony Doors', cat: 'Wall', colors: ['#f2e3c2', '#e8b0c8', '#a8c0cc'], make: makeBalconyDoors, wall: true, floorWall: true },
  { id: 'balcony', name: 'Door to Balcony', cat: 'Wall', colors: ['#f2ead9', '#3d3f45', '#7d9471'], make: makeBalcony, wall: true, floorWall: true },
  { id: 'frame', name: 'Sunset Print', cat: 'Wall', colors: ['#6b4a2f', '#e0d4bd', '#3d3f45'], make: makePictureFrame, wall: true },
  { id: 'frame-trio', name: 'Picture-frame Trio', cat: 'Wall', colors: WOODS, make: makeFrameTrio, wall: true },
  { id: 'clock', name: 'Wall Clock', cat: 'Wall', colors: ['#6b4a2f', '#b98a5e', '#3d3f45'], make: makeWallClock, wall: true },
  { id: 'wall-shelf', name: 'Wall Book Shelf', cat: 'Wall', colors: ['#b98a5e', '#6b4a2f', '#e0d4bd'], make: makeWallShelf, wall: true },
];

export const CATEGORIES: Category[] = [
  'Seating', 'Beds', 'Tables', 'Storage', 'Workspace', 'Decor', 'Toys', 'Lighting', 'Plants', 'Rugs', 'Wall', 'Seasonal',
];

// Finish options per item; the first entry matches the factory's native look.
{
  const assign = (ids: string[], mats: MaterialKind[]): void => {
    for (const id of ids) {
      const def = CATALOG.find((d) => d.id === id);
      if (def) def.materials = mats;
    }
  };
  assign(
    ['sofa', 'corner-sofa', 'armchair', 'ottoman', 'cushion', 'bed', 'canopy-bed', 'desk-chair', 'ergo-chair', 'teddy', 'basket'],
    ['fabric', 'leather', 'plain']
  );
  assign(
    ['chair', 'rocking-chair', 'desk', 'dining-table', 'coffee-table', 'side-table', 'nightstand',
     'bookshelf', 'low-bookcase', 'cube-storage', 'wardrobe', 'dresser', 'toybox', 'billy', 'billy-oxberg',
     'standing-desk', 'record-player', 'music-box', 'mantel-clock', 'standing-mirror', 'wall-shelf',
     'clock', 'frame', 'frame-trio', 'door', 'barn-door', 'arched-door', 'dutch-door', 'speakers', 'snow-globe', 'window'],
    ['wood', 'plain', 'metal']
  );
  assign(
    ['modern-door', 'plant', 'small-plant', 'fern', 'mushroom-pot', 'floor-lamp', 'table-lamp', 'candles', 'radio',
     'train', 'camera', 'dollhouse', 'desktop', 'keyboard', 'printer', 'rolling-drawers', 'radiator',
     'wall-ac', 'monitor', 'ultrawide', 'vase'],
    ['plain', 'wood', 'metal']
  );
  assign(['filing-cabinet', 'laptop', 'globe'], ['metal', 'plain', 'wood']);
}

export function getDef(id: string): ItemDef | undefined {
  return CATALOG.find((d) => d.id === id);
}
