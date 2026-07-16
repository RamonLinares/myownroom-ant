import type { WallFinish, FloorFinish } from '../assets/materials';

export interface StyleRecipe {
  id: string;
  name: string;
  wallStyle: WallFinish;
  wallColor: string;
  floorStyle: FloorFinish;
  floorColor: string;
  mood: 'day' | 'sunset' | 'night';
  /** Colors dealt out to the room's tintable items. */
  palette: string[];
}

export const STYLE_RECIPES: StyleRecipe[] = [
  {
    id: 'scandi',
    name: 'Scandinavian',
    wallStyle: 'paint',
    wallColor: '#f2f0ec',
    floorStyle: 'planks',
    floorColor: '#e0d4bd',
    mood: 'day',
    palette: ['#e8e4dc', '#b8c4c2', '#8a9a94', '#c9b48a', '#5e7a94', '#e0d4bd'],
  },
  {
    id: 'cottage',
    name: 'Cozy Cottage',
    wallStyle: 'sprigs',
    wallColor: '#f2d8c8',
    floorStyle: 'planks',
    floorColor: '#a8734a',
    mood: 'sunset',
    palette: ['#7d9471', '#b0685e', '#c9a04a', '#b98a5e', '#a8788a', '#8a5a3a'],
  },
  {
    id: 'retro',
    name: 'Retro',
    wallStyle: 'stripes',
    wallColor: '#e8d4b0',
    floorStyle: 'chevron',
    floorColor: '#c9a04a',
    mood: 'sunset',
    palette: ['#c96f4a', '#40809b', '#c9a04a', '#7a5aa0', '#b7674f', '#4f8a58'],
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    wallStyle: 'paint',
    wallColor: '#f6f5f2',
    floorStyle: 'tiles',
    floorColor: '#b8b0a2',
    mood: 'day',
    palette: ['#e8e6e2', '#3d3f45', '#b8b0a2', '#9aa0a8', '#d8d4cc'],
  },
  {
    id: 'academia',
    name: 'Dark Academia',
    wallStyle: 'paint',
    wallColor: '#8a7a62',
    floorStyle: 'planks',
    floorColor: '#5a4232',
    mood: 'night',
    palette: ['#4f5d43', '#6e3b32', '#8a5a3a', '#3d3a35', '#7a5aa0', '#c9a04a'],
  },
];
