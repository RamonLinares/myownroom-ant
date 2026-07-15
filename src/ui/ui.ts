import { CATALOG, CATEGORIES, type Category } from '../assets/catalog';
import type { PlacedItem, RoomGame, MoodName } from '../game/game';
import type { RoomShape } from '../game/room';
import { thumbnail } from './thumbs';
import { audio } from '../core/audio';

const MOOD_CYCLE: MoodName[] = ['day', 'sunset', 'night'];
const MOOD_ICON: Record<MoodName, string> = { day: '☀️', sunset: '🌇', night: '🌙' };

export function buildUI(root: HTMLElement, game: RoomGame): void {
  root.insertAdjacentHTML(
    'beforeend',
    `
    <header class="topbar">
      <div class="brand">
        <span class="brand-dot"></span>
        <h1>My Own Room</h1>
        <span class="count-badge" id="item-count">0</span>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" id="btn-room" title="Room size & shape">🏠</button>
        <button class="icon-btn" id="btn-walk" title="Walk around your room">👣</button>
        <button class="icon-btn" id="btn-photo" title="Take a photo">📷</button>
        <button class="icon-btn" id="btn-mood" title="Lighting mood">☀️</button>
        <button class="icon-btn" id="btn-mute" title="Sound on/off">🔊</button>
        <button class="icon-btn danger" id="btn-clear" title="Empty the room">🗑</button>
      </div>
    </header>

    <aside class="catalog" id="catalog">
      <div class="catalog-head">
        <h2>Catalog</h2>
        <button class="icon-btn small" id="btn-close-catalog" title="Hide catalog">✕</button>
      </div>
      <input type="search" class="cat-search" id="cat-search" placeholder="Search all items…" autocomplete="off" />
      <nav class="cat-tabs" id="cat-tabs"></nav>
      <div class="cat-grid" id="cat-grid"></div>
    </aside>
    <button class="fab" id="btn-open-catalog" title="Open catalog">＋</button>

    <section class="inspector hidden" id="inspector">
      <div class="inspector-head">
        <h3 id="insp-name">Item</h3>
        <button class="icon-btn small" id="btn-deselect" title="Deselect">✕</button>
      </div>
      <div class="insp-row" id="insp-rotate-row">
        <span class="insp-label">Turn</span>
        <div class="btn-pair">
          <button class="tool-btn" id="btn-rot-l" title="Rotate left (Q)">⟲</button>
          <button class="tool-btn" id="btn-rot-r" title="Rotate right (E)">⟳</button>
          <button class="tool-btn" id="btn-flip" title="Flip / mirror (F)">⇋</button>
        </div>
      </div>
      <div class="insp-row">
        <span class="insp-label">Size</span>
        <input type="range" id="insp-scale" min="0.6" max="1.5" step="0.05" value="1" />
      </div>
      <div class="insp-row">
        <span class="insp-label">Color</span>
        <div class="swatches" id="insp-swatches"></div>
      </div>
      <div class="insp-actions">
        <button class="pill-btn" id="btn-duplicate">⧉ Duplicate</button>
        <button class="pill-btn danger" id="btn-delete">🗑 Remove</button>
      </div>
    </section>

    <section class="room-panel hidden" id="room-panel">
      <div class="inspector-head">
        <h3>Room</h3>
        <button class="icon-btn small" id="btn-room-close" title="Close">✕</button>
      </div>
      <div class="insp-row">
        <span class="insp-label">Shape</span>
        <div class="btn-pair" id="room-shapes">
          <button class="tool-btn shape-btn" data-shape="rect" title="Rectangle">▭</button>
          <button class="tool-btn shape-btn" data-shape="l" title="L shape">L</button>
          <button class="tool-btn shape-btn" data-shape="t" title="T shape">T</button>
          <button class="tool-btn shape-btn" data-shape="u" title="U shape">U</button>
        </div>
      </div>
      <div class="insp-row">
        <span class="insp-label">Width</span>
        <input type="range" id="room-w" min="6" max="14" step="0.5" />
      </div>
      <div class="insp-row">
        <span class="insp-label">Depth</span>
        <input type="range" id="room-d" min="5" max="12" step="0.5" />
      </div>
    </section>

    <footer class="hintbar" id="hintbar">Tap an item in the catalog to add it · drag furniture to arrange your room</footer>
    <div class="toast" id="toast"></div>
    <div class="flash" id="flash"></div>
    <div class="joystick hidden" id="joystick"><div class="joy-thumb" id="joy-thumb"></div></div>
    <section class="photo-card hidden" id="photo-card">
      <img id="photo-img" alt="Room photo" />
      <div class="photo-actions">
        <a class="pill-btn" id="photo-download" download="my-own-room.png">⬇ Save photo</a>
        <button class="pill-btn" id="photo-close">✕ Close</button>
      </div>
    </section>
    `
  );

  const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  const catalogEl = $('catalog');
  const grid = $('cat-grid');
  const tabs = $('cat-tabs');
  const inspector = $('inspector');
  const hintbar = $('hintbar');
  const toast = $('toast');
  const scaleInput = $<HTMLInputElement>('insp-scale');
  const searchInput = $<HTMLInputElement>('cat-search');
  let activeCat: Category = 'Seating';
  let toastTimer = 0;

  const showToast = (text: string): void => {
    toast.textContent = text;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1900);
  };

  // ----- catalog -----
  const renderTabs = (): void => {
    tabs.innerHTML = '';
    const searching = searchInput.value.trim().length > 0;
    for (const cat of CATEGORIES) {
      const b = document.createElement('button');
      b.className = 'cat-tab' + (!searching && cat === activeCat ? ' active' : '');
      b.textContent = cat;
      b.addEventListener('click', () => {
        activeCat = cat;
        searchInput.value = '';
        audio.click();
        renderTabs();
        renderGrid();
      });
      tabs.appendChild(b);
    }
  };

  const renderGrid = (): void => {
    grid.innerHTML = '';
    const query = searchInput.value.trim().toLowerCase();
    // Searching spans every category, like the original; tabs filter otherwise.
    const defs = query
      ? CATALOG.filter((d) => d.name.toLowerCase().includes(query) || d.cat.toLowerCase().includes(query))
      : CATALOG.filter((d) => d.cat === activeCat);
    if (defs.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'cat-empty';
      empty.textContent = `Nothing matches “${searchInput.value.trim()}”`;
      grid.appendChild(empty);
      return;
    }
    for (const def of defs) {
      const card = document.createElement('button');
      card.className = 'cat-card';
      const img = document.createElement('img');
      img.alt = def.name;
      img.src = thumbnail(def);
      const label = document.createElement('span');
      label.textContent = def.name;
      card.append(img, label);
      card.addEventListener('click', () => {
        game.addItem(def.id);
        showToast(`${def.name} added`);
        if (window.innerWidth < 720) catalogEl.classList.add('collapsed');
      });
      grid.appendChild(card);
    }
  };

  renderTabs();
  renderGrid();
  searchInput.addEventListener('input', () => {
    renderTabs();
    renderGrid();
  });

  $('btn-close-catalog').addEventListener('click', () => catalogEl.classList.add('collapsed'));
  $('btn-open-catalog').addEventListener('click', () => catalogEl.classList.remove('collapsed'));
  // Defer the initial collapse decision: the viewport may not have its real size yet at load.
  requestAnimationFrame(() => {
    if (window.innerWidth > 0 && window.innerWidth < 720) catalogEl.classList.add('collapsed');
  });

  // ----- inspector -----
  const renderSwatches = (item: PlacedItem): void => {
    const wrap = $('insp-swatches');
    wrap.innerHTML = '';
    for (const color of item.def.colors) {
      const s = document.createElement('button');
      s.className = 'swatch' + (color === item.color ? ' active' : '');
      s.style.background = color;
      s.title = color;
      s.addEventListener('click', () => {
        game.recolorSelected(color);
        renderSwatches(item);
      });
      wrap.appendChild(s);
    }
    // Free color choice via the native picker, presented as a rainbow swatch.
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'swatch picker' + (item.def.colors.includes(item.color) ? '' : ' active');
    picker.title = 'Custom color';
    picker.value = /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#ffffff';
    picker.addEventListener('input', () => {
      game.recolorSelected(picker.value, true);
      for (const el of Array.from(wrap.querySelectorAll('.swatch'))) el.classList.remove('active');
      picker.classList.add('active');
    });
    picker.addEventListener('change', () => audio.click());
    wrap.appendChild(picker);
  };

  game.onSelectionChange = (item) => {
    if (!item) {
      inspector.classList.add('hidden');
      return;
    }
    inspector.classList.remove('hidden');
    $('insp-name').textContent = item.def.name;
    scaleInput.value = String(Math.abs(item.group.scale.x));
    // Wall items cannot rotate freely (they follow their wall) but can flip.
    $('btn-rot-l').style.display = item.def.wall ? 'none' : '';
    $('btn-rot-r').style.display = item.def.wall ? 'none' : '';
    renderSwatches(item);
  };

  game.onItemsChange = (count) => {
    $('item-count').textContent = String(count);
  };
  game.onItemsChange(game.items.length);

  game.onHint = (text) => {
    hintbar.textContent = text;
  };

  $('btn-deselect').addEventListener('click', () => game.select(null));
  $('btn-rot-l').addEventListener('click', () => game.rotateSelected(-1));
  $('btn-rot-r').addEventListener('click', () => game.rotateSelected(1));
  $('btn-flip').addEventListener('click', () => game.flipSelected());
  scaleInput.addEventListener('input', () => game.scaleSelected(parseFloat(scaleInput.value)));
  $('btn-duplicate').addEventListener('click', () => game.duplicateSelected());
  $('btn-delete').addEventListener('click', () => game.removeSelected());

  // ----- topbar -----
  const moodBtn = $('btn-mood');
  moodBtn.addEventListener('click', () => {
    const next = MOOD_CYCLE[(MOOD_CYCLE.indexOf(game.getMood()) + 1) % MOOD_CYCLE.length];
    game.setMood(next);
    moodBtn.textContent = MOOD_ICON[next];
    audio.click();
    showToast(`Mood: ${next}`);
  });
  moodBtn.textContent = MOOD_ICON[game.getMood()];

  const muteBtn = $('btn-mute');
  const syncMute = (): void => {
    muteBtn.textContent = audio.muted ? '🔇' : '🔊';
  };
  muteBtn.addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    syncMute();
  });
  syncMute();

  // ----- room shape & size -----
  const roomPanel = $('room-panel');
  const roomW = $<HTMLInputElement>('room-w');
  const roomD = $<HTMLInputElement>('room-d');
  const shapeBtns = Array.from(roomPanel.querySelectorAll<HTMLButtonElement>('.shape-btn'));
  const syncRoomUI = (): void => {
    const cfg = game.getRoomConfig();
    roomW.value = String(cfg.w);
    roomD.value = String(cfg.d);
    for (const b of shapeBtns) b.classList.toggle('active', b.dataset.shape === cfg.shape);
  };
  $('btn-room').addEventListener('click', () => {
    roomPanel.classList.toggle('hidden');
    syncRoomUI();
    audio.click();
  });
  $('btn-room-close').addEventListener('click', () => roomPanel.classList.add('hidden'));
  for (const b of shapeBtns) {
    b.addEventListener('click', () => {
      game.setRoomConfig({ ...game.getRoomConfig(), shape: b.dataset.shape as RoomShape });
      syncRoomUI();
      audio.click();
    });
  }
  roomW.addEventListener('input', () => game.setRoomConfig({ ...game.getRoomConfig(), w: parseFloat(roomW.value) }));
  roomD.addEventListener('input', () => game.setRoomConfig({ ...game.getRoomConfig(), d: parseFloat(roomD.value) }));
  syncRoomUI();

  // ----- walk mode -----
  const walkBtn = $('btn-walk');
  walkBtn.addEventListener('click', () => game.toggleWalk());
  game.onModeChange = (mode) => {
    document.body.classList.toggle('walk-mode', mode === 'walk');
    walkBtn.classList.toggle('active', mode === 'walk');
    walkBtn.textContent = mode === 'walk' ? '🚪' : '👣';
    walkBtn.title = mode === 'walk' ? 'Exit walk mode' : 'Walk around your room';
    if (mode === 'walk') catalogEl.classList.add('collapsed');
  };

  const joystick = $('joystick');
  const joyThumb = $('joy-thumb');
  game.onJoystick = (state) => {
    if (!state) {
      joystick.classList.add('hidden');
      return;
    }
    joystick.classList.remove('hidden');
    joystick.style.left = `${state.x}px`;
    joystick.style.top = `${state.y}px`;
    joyThumb.style.transform = `translate(${state.dx}px, ${state.dy}px)`;
  };

  // ----- photography -----
  const photoCard = $('photo-card');
  const photoImg = $<HTMLImageElement>('photo-img');
  const photoDownload = $<HTMLAnchorElement>('photo-download');
  const flash = $('flash');
  $('btn-photo').addEventListener('click', () => {
    const url = game.takePhoto();
    flash.classList.add('show');
    window.setTimeout(() => flash.classList.remove('show'), 260);
    photoImg.src = url;
    photoDownload.href = url;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    photoDownload.download = `my-own-room-${stamp}.png`;
    photoCard.classList.remove('hidden');
  });
  $('photo-close').addEventListener('click', () => {
    photoCard.classList.add('hidden');
    audio.click();
  });

  $('btn-clear').addEventListener('click', () => {
    if (game.items.length === 0) return;
    if (window.confirm('Empty the whole room? This cannot be undone.')) {
      game.clearRoom();
      showToast('Room emptied — a fresh start!');
    }
  });

  // ----- keyboard -----
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (game.getMode() === 'walk') {
      if (e.key === 'Escape') game.exitWalk();
      if (e.key.toLowerCase() === 'p') $('btn-photo').click();
      return;
    }
    switch (e.key.toLowerCase()) {
      case 'q': game.rotateSelected(-1); break;
      case 'e': game.rotateSelected(1); break;
      case 'f': game.flipSelected(); break;
      case 'd': game.duplicateSelected(); break;
      case 'delete':
      case 'backspace': game.removeSelected(); break;
      case 'escape': game.select(null); break;
      case '[': if (game.selected) game.scaleSelected(Math.abs(game.selected.group.scale.x) - 0.05); break;
      case ']': if (game.selected) game.scaleSelected(Math.abs(game.selected.group.scale.x) + 0.05); break;
    }
    if (game.selected) scaleInput.value = String(Math.abs(game.selected.group.scale.x));
  });
}
