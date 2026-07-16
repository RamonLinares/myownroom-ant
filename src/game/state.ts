export interface SavedItem {
  def: string;
  pos: [number, number, number];
  rot: number;
  scale: number;
  flip?: boolean;
  color: string;
  mat?: string;
  /** Room id a door leads to (walk mode walks through). */
  link?: string;
  /** Custom uploaded image (data URL) for imageable items. */
  img?: string;
}

export interface SavedRoom {
  version: 1;
  mood: string;
  title?: string;
  locked?: boolean;
  /** Imported GLB models (base64) referenced by item defs. */
  assets?: Record<string, { name: string; data: string }>;
  room?: {
    w: number;
    d: number;
    shape: string;
    wallStyle?: string;
    wallColor?: string;
    floorStyle?: string;
    floorColor?: string;
  };
  items: SavedItem[];
}

const KEY = 'myownroom-ant-v1';
const HOME_KEY = 'myownroom-ant-home-v1';

export interface HomeRoom {
  id: string;
  data: SavedRoom;
}

/** A small home: several rooms, one active. */
export interface HomeState {
  version: 1;
  activeId: string;
  rooms: HomeRoom[];
}

export function saveHome(home: HomeState): void {
  try {
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  } catch {
    // Storage full or unavailable: the session simply won't persist.
  }
}

export function loadHome(): HomeState | null {
  try {
    const raw = localStorage.getItem(HOME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeState;
    if (parsed.version !== 1 || !Array.isArray(parsed.rooms) || parsed.rooms.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRoom(room: SavedRoom): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(room));
  } catch {
    // Storage full or unavailable: the session simply won't persist.
  }
}

export function loadRoom(): SavedRoom | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRoom;
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSaved(): void {
  localStorage.removeItem(KEY);
}
