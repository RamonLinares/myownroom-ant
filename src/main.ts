import './styles.css';
import { RoomGame } from './game/game';
import { buildUI } from './ui/ui';

const app = document.getElementById('app')!;
const canvas = document.createElement('canvas');
canvas.className = 'game-canvas';
app.appendChild(canvas);

const game = new RoomGame(canvas);
buildUI(app, game);

if (import.meta.env.DEV) {
  (window as unknown as { __game: RoomGame }).__game = game;
}
