export interface SavedItem {
  def: string;
  pos: [number, number, number];
  rot: number;
  scale: number;
  flip?: boolean;
  color: string;
}

export interface SavedRoom {
  version: 1;
  mood: string;
  title?: string;
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
