import type { SavedItem, SavedRoom } from './state';

/**
 * Hand-curated famous rooms: fixed layouts built item by item, unlike the
 * assistant's randomized kits. Floor items use y=0 and settle on load;
 * wall items carry their mounting height.
 */

export interface FamousRoom {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  build: () => SavedRoom;
}

const item = (
  def: string,
  x: number,
  z: number,
  rot = 0,
  color = '',
  y = 0
): SavedItem => ({ def, pos: [x, y, z], rot, scale: 1, color });

/**
 * A 90s NYC sitcom apartment: kitchen peninsula with blue stools on the
 * right, blue couch and armchair around the TV on the left, dining table
 * behind the couch, computer desk by the window, and a bike on the wall.
 */
function sitcomApartment(): SavedRoom {
  const W = 9.5, D = 7;
  const zB = -D / 2, zF = D / 2, xL = -W / 2, xR = W / 2;
  const GAP = 0.035;
  const items: SavedItem[] = [
    // --- kitchen, right side: counter run on the back wall, fridge on the right
    item('kitchen-counter', 1.3, zB + 0.42, 0, '#9aa0a8'),
    item('kettle', 1.0, zB + 0.42, 0, '#e0d4bd'),
    item('microwave', 1.55, zB + 0.4, 0, '#e0d4bd'),
    item('stove', 2.3, zB + 0.42, 0, '#e0d4bd'),
    item('frying-pan', 2.36, zB + 0.36, 0.4, '#3d3f45'),
    item('kitchen-sink', 3.3, zB + 0.42, 0, '#9aa0a8'),
    item('tall-fridge', 4.28, -1.4, -Math.PI / 2, '#e8e6e2'),
    item('cereal-boxes', 4.28, -1.4, -Math.PI / 2, '#c96f4a'),
    item('basket', 3.6, -0.4, 0, '#3d3f45'),
    // Peninsula with the blue stools tucked on the room side.
    item('kitchen-island', 2.55, 0.35, -Math.PI / 2, '#9aa0a8'),
    item('mugs', 2.6, 0.0, 0.3, '#5e7a94'),
    item('vase', 2.5, 0.7, 0, '#7ea8b8'),
    item('bar-stool', 1.75, -0.15, 0, '#3f5aa0'),
    item('bar-stool', 1.75, 0.5, 0, '#3f5aa0'),
    item('bar-stool', 1.75, 1.15, 0, '#3f5aa0'),
    // --- living room, left side: couch faces the TV console
    item('rect-rug', -1.7, 0.7, 0, '#8f9299'),
    item('sofa', -1.6, -0.25, 0, '#7ea8b8'),
    item('armchair', -3.35, 0.45, 0.7, '#7ea8b8'),
    item('coffee-table', -1.6, 0.95, 0, '#3d3f45'),
    item('books', -1.85, 0.9, 0.3, '#a24a3f'),
    item('side-table', -2.95, -1.05, 0, '#26262a'),
    item('table-lamp', -2.95, -1.05, 0, '#e8dcc2'),
    item('hifi', -1.6, 2.75, Math.PI, '#3d3f45'),
    item('tv', -1.6, 2.75, Math.PI, '#2c2e33'),
    // --- dining table behind the couch
    item('dining-table', 0.2, -1.55, 0, '#b98a5e'),
    item('chair', 0.2, -2.35, 0, '#6b4a2f'),
    item('chair', 0.2, -0.75, Math.PI, '#6b4a2f'),
    item('chair', -0.85, -1.55, Math.PI / 2, '#6b4a2f'),
    // --- computer desk by the window, tall bookshelf, console on the left wall
    item('desk', -3.5, zB + 0.55, 0, '#6b4a2f'),
    item('monitor', -3.55, zB + 0.5, 0, '#e0d4bd'),
    item('keyboard', -3.4, zB + 0.72, 0, '#e0d4bd'),
    item('desk-chair', -3.5, zB + 1.45, Math.PI, '#3d3f45'),
    item('bookshelf', -0.5, zB + 0.42, 0, '#3d3f45'),
    item('books', -0.7, zB + 0.4, 0.2, '#3f6ba2'),
    item('books', -0.25, zB + 0.45, -0.3, '#7a5aa0'),
    item('globe', -0.5, zB + 0.4, 0, '#c9a04a'),
    item('low-bookcase', xL + 0.42, 0.9, Math.PI / 2, '#26262a'),
    item('radio', xL + 0.42, 0.7, 0.2, '#c96f4a'),
    item('mantel-clock', xL + 0.44, 1.2, 0, '#3d3f45'),
    // Navy ottoman by the door.
    item('ottoman', 0.35, 2.55, 0, '#3f4a6b'),
    // --- walls: windows and radiator at the back, door and bike up front
    item('window', -3.5, zB + GAP, 0, '#e8e0d0', 1.75),
    item('window', -4.75 + GAP, -1.6, Math.PI / 2, '#e8e0d0', 1.75),
    item('radiator', -2.35, zB + GAP, 0, '#d8d4cc'),
    item('kitchen-cabinet', 1.3, zB + GAP, 0, '#5e6a94', 2.05),
    item('kitchen-cabinet', 3.3, zB + GAP, 0, '#5e6a94', 2.05),
    item('modern-door', 1.55, zF - GAP, Math.PI, '#9aa0a8'),
    // The green bike hangs high on the back wall, over the bookshelf.
    item('wall-bike', -0.05, zB + GAP, 0, '#4f8a58', 2.4),
    item('frame', 3.2, zF - GAP, Math.PI, '#6b4a2f', 1.9),
    item('frame-trio', xL + GAP, -3.0, Math.PI / 2, '#3d3f45', 1.95),
    item('clock', 0.9, zB + GAP, 0, '#3d3f45', 2.25),
  ];
  return {
    version: 1,
    mood: 'day',
    title: 'The Sitcom Apartment',
    room: {
      w: W,
      d: D,
      shape: 'rect',
      wallStyle: 'paint',
      wallColor: '#e6e3dc',
      floorStyle: 'planks',
      floorColor: '#d8b284',
    },
    items,
  };
}

export const FAMOUS_ROOMS: FamousRoom[] = [
  {
    id: 'sitcom-apartment',
    name: 'The Sitcom Apartment',
    emoji: '📺',
    blurb: 'A 90s NYC one-bedroom about nothing: blue couch, kitchen peninsula, and a bike on the wall',
    build: sitcomApartment,
  },
];
