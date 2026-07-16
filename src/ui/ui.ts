import { CATALOG, CATEGORIES, type Category } from '../assets/catalog';
import type { PlacedItem, RoomGame, MoodName } from '../game/game';
import { WALL_COLORS, FLOOR_COLORS, type RoomShape } from '../game/room';
import { WALL_FINISHES, FLOOR_FINISHES, type WallFinish, type FloorFinish } from '../assets/materials';
import { thumbnail } from './thumbs';
import { audio } from '../core/audio';

const MOOD_CYCLE: MoodName[] = ['day', 'sunset', 'night'];

const svg = (inner: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const ICONS = {
  lock: svg('<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
  lockOpen: svg('<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 7.8-1.2"/>'),
  home: svg('<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>'),
  walk: svg('<circle cx="13" cy="4.2" r="1.8"/><path d="M13 6.5l-1.2 5.2 2.8 3.3 1.2 4.8"/><path d="M11.8 11.7l-2.6 2.9-1.8 4.2"/><path d="M12.4 8.6l-3.2 1.2-1 3"/><path d="M13.4 9.4l2.6 1.6 2.2.4"/>'),
  door: svg('<rect x="6" y="3.5" width="12" height="17" rx="1"/><circle cx="15" cy="12.5" r="1.1" fill="currentColor" stroke="none"/>'),
  camera: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7l1.4-2.5h4.2L15.5 7"/><circle cx="12" cy="13" r="3.6"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>'),
  sunset: svg('<path d="M7 15a5 5 0 0 1 10 0"/><path d="M3 15h2M19 15h2M12 5v3M6.3 8.3l1.4 1.4M17.7 8.3l-1.4 1.4"/><path d="M4 19h16"/>'),
  moon: svg('<path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z"/>'),
  sound: svg('<path d="M4 9.5v5h3l5 4.5v-14L7 9.5H4z"/><path d="M15.5 9.2a4.5 4.5 0 0 1 0 5.6M18 6.5a8 8 0 0 1 0 11"/>'),
  muted: svg('<path d="M4 9.5v5h3l5 4.5v-14L7 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  trash: svg('<path d="M4 7h16M9.5 7V4.5h5V7"/><path d="M6 7l1 13.5h10L18 7"/><path d="M10 10.5v6M14 10.5v6"/>'),
};

const MOOD_ICON: Record<MoodName, string> = { day: ICONS.sun, sunset: ICONS.sunset, night: ICONS.moon };

export function buildUI(root: HTMLElement, game: RoomGame): void {
  root.insertAdjacentHTML(
    'beforeend',
    `
    <header class="topbar">
      <div class="brand">
        <span class="brand-dot"></span>
        <h1 id="room-title" contenteditable="true" spellcheck="false" title="Click to rename your room">My Own Room</h1>
        <span class="count-badge" id="item-count">0</span>
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" id="btn-lock" title="Lock the room"></button>
        <button class="icon-btn" id="btn-room" title="Room size & shape"></button>
        <button class="icon-btn" id="btn-walk" title="Walk around your room"></button>
        <button class="icon-btn" id="btn-photo" title="Take a photo"></button>
        <button class="icon-btn" id="btn-mood" title="Lighting mood"></button>
        <button class="icon-btn" id="btn-mute" title="Sound on/off"></button>
        <button class="icon-btn danger" id="btn-clear" title="Empty the room"></button>
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
      <button class="pill-btn glb-btn" id="btn-import-glb">⬆ Import 3D model (.glb)</button>
      <input type="file" id="glb-file" accept=".glb,.gltf,model/gltf-binary" hidden />
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
      <div class="insp-row" id="insp-mat-row">
        <span class="insp-label">Finish</span>
        <nav class="cat-tabs finish-tabs" id="insp-mats"></nav>
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
      <div class="finish-block">
        <span class="insp-label">Walls</span>
        <nav class="cat-tabs finish-tabs" id="wall-styles"></nav>
        <div class="swatches" id="wall-colors"></div>
      </div>
      <div class="finish-block">
        <span class="insp-label">Floor</span>
        <nav class="cat-tabs finish-tabs" id="floor-styles"></nav>
        <div class="swatches" id="floor-colors"></div>
      </div>
      <div class="insp-actions">
        <button class="pill-btn" id="btn-save-room">⬇ Save room</button>
        <button class="pill-btn" id="btn-load-room">⬆ Load room</button>
      </div>
      <input type="file" id="room-file" accept=".json,application/json" hidden />
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
  $('btn-room').innerHTML = ICONS.home;
  $('btn-walk').innerHTML = ICONS.walk;
  $('btn-photo').innerHTML = ICONS.camera;
  $('btn-clear').innerHTML = ICONS.trash;
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

  const glbFile = $<HTMLInputElement>('glb-file');
  $('btn-import-glb').addEventListener('click', () => glbFile.click());
  glbFile.addEventListener('change', () => {
    const file = glbFile.files?.[0];
    glbFile.value = '';
    if (!file) return;
    showToast('Loading model…');
    void game.importGlbFile(file).then((ok) => {
      if (ok) {
        showToast(`${file.name} added to the room`);
        if (window.innerWidth < 720) catalogEl.classList.add('collapsed');
      }
    });
  });
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

  const MAT_LABELS: Record<string, string> = {
    fabric: 'Fabric', leather: 'Leather', wood: 'Wood', plain: 'Plain', metal: 'Metal',
  };
  const renderMats = (item: PlacedItem): void => {
    const row = $('insp-mat-row');
    const host = $('insp-mats');
    const mats = item.def.materials ?? [];
    row.style.display = mats.length > 1 ? '' : 'none';
    host.innerHTML = '';
    for (const kind of mats) {
      const b = document.createElement('button');
      b.className = 'cat-tab' + (kind === item.material ? ' active' : '');
      b.textContent = MAT_LABELS[kind] ?? kind;
      b.addEventListener('click', () => {
        game.setMaterialSelected(kind);
        renderMats(item);
      });
      host.appendChild(b);
    }
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
    // Imported models have no tintable parts: hide the color row entirely.
    ($('insp-swatches').parentElement as HTMLElement).style.display = item.def.colors.length ? '' : 'none';
    renderSwatches(item);
    renderMats(item);
  };

  game.onItemsChange = (count) => {
    $('item-count').textContent = String(count);
  };
  game.onItemsChange(game.items.length);

  game.onHint = (text) => {
    hintbar.textContent = text;
  };

  game.onToast = showToast;

  // ----- lock mode -----
  const lockBtn = $('btn-lock');
  const syncLock = (): void => {
    const locked = game.isLocked();
    lockBtn.innerHTML = locked ? ICONS.lock : ICONS.lockOpen;
    lockBtn.title = locked ? 'Unlock the room' : 'Lock the room';
    lockBtn.classList.toggle('active', locked);
    document.body.classList.toggle('locked', locked);
    if (game.getMode() === 'edit') {
      hintbar.textContent = locked
        ? 'Room is locked — orbit, walk and photograph freely'
        : 'Tap an item in the catalog to add it · drag furniture to arrange your room';
    }
  };
  lockBtn.addEventListener('click', () => {
    game.setLocked(!game.isLocked());
    syncLock();
    showToast(game.isLocked() ? 'Room locked — look, but don’t touch' : 'Room unlocked');
    audio.click();
  });
  syncLock();

  // ----- room title -----
  const titleEl = $('room-title');
  const syncTitle = (): void => {
    titleEl.textContent = game.getTitle();
    document.title = game.getTitle();
  };
  syncTitle();
  titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleEl.blur();
    }
  });
  titleEl.addEventListener('blur', () => {
    game.setTitle(titleEl.textContent ?? '');
    syncTitle();
  });

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
    moodBtn.innerHTML = MOOD_ICON[next];
    audio.click();
    showToast(`Mood: ${next}`);
  });
  moodBtn.innerHTML = MOOD_ICON[game.getMood()];

  const muteBtn = $('btn-mute');
  const syncMute = (): void => {
    muteBtn.innerHTML = audio.muted ? ICONS.muted : ICONS.sound;
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
    syncWallRow();
    syncFloorRow();
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

  // Wall & floor finishes: style pills plus tint swatches with a free picker.
  const FINISH_LABELS: Record<string, string> = {
    paint: 'Paint', stripes: 'Stripes', dots: 'Polka', sprigs: 'Sprigs',
    planks: 'Planks', chevron: 'Chevron', tiles: 'Tiles', carpet: 'Carpet',
  };
  const buildFinishRow = (
    stylesHost: HTMLElement,
    colorsHost: HTMLElement,
    styles: readonly string[],
    palette: readonly string[],
    getActive: () => { style: string; color: string },
    apply: (patch: { style?: string; color?: string }) => void
  ): (() => void) => {
    const sync = (): void => {
      const active = getActive();
      stylesHost.innerHTML = '';
      for (const st of styles) {
        const b = document.createElement('button');
        b.className = 'cat-tab' + (st === active.style ? ' active' : '');
        b.textContent = FINISH_LABELS[st] ?? st;
        b.addEventListener('click', () => {
          apply({ style: st });
          audio.click();
          sync();
        });
        stylesHost.appendChild(b);
      }
      colorsHost.innerHTML = '';
      for (const color of palette) {
        const sw = document.createElement('button');
        sw.className = 'swatch small' + (color.toLowerCase() === active.color.toLowerCase() ? ' active' : '');
        sw.style.background = color;
        sw.title = color;
        sw.addEventListener('click', () => {
          apply({ color });
          audio.click();
          sync();
        });
        colorsHost.appendChild(sw);
      }
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'swatch small picker' + (palette.some((c) => c.toLowerCase() === active.color.toLowerCase()) ? '' : ' active');
      picker.title = 'Custom color';
      picker.value = active.color;
      picker.addEventListener('input', () => apply({ color: picker.value }));
      picker.addEventListener('change', () => {
        audio.click();
        sync();
      });
      colorsHost.appendChild(picker);
    };
    return sync;
  };

  const syncWallRow = buildFinishRow(
    $('wall-styles'), $('wall-colors'), WALL_FINISHES, WALL_COLORS,
    () => ({ style: game.getRoomConfig().wallStyle, color: game.getRoomConfig().wallColor }),
    (p) => {
      const cfg = game.getRoomConfig();
      game.setRoomConfig({ ...cfg, wallStyle: (p.style ?? cfg.wallStyle) as WallFinish, wallColor: p.color ?? cfg.wallColor });
    }
  );
  const syncFloorRow = buildFinishRow(
    $('floor-styles'), $('floor-colors'), FLOOR_FINISHES, FLOOR_COLORS,
    () => ({ style: game.getRoomConfig().floorStyle, color: game.getRoomConfig().floorColor }),
    (p) => {
      const cfg = game.getRoomConfig();
      game.setRoomConfig({ ...cfg, floorStyle: (p.style ?? cfg.floorStyle) as FloorFinish, floorColor: p.color ?? cfg.floorColor });
    }
  );
  syncWallRow();
  syncFloorRow();
  syncRoomUI();

  // ----- save / load room files -----
  const roomFile = $<HTMLInputElement>('room-file');
  $('btn-save-room').addEventListener('click', () => {
    const data = JSON.stringify(game.exportRoom(), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-own-room-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audio.click();
    showToast('Room saved to file');
  });
  $('btn-load-room').addEventListener('click', () => roomFile.click());
  roomFile.addEventListener('change', () => {
    const file = roomFile.files?.[0];
    roomFile.value = '';
    if (!file) return;
    void file.text().then((text) => {
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        showToast('That file is not a room save');
        return;
      }
      if (!window.confirm('Replace your current room with the loaded file?')) return;
      if (game.importRoom(data)) {
        moodBtn.innerHTML = MOOD_ICON[game.getMood()];
        syncRoomUI();
        syncWallRow();
        syncFloorRow();
        syncTitle();
        syncLock();
        showToast('Room loaded!');
        audio.place();
      } else {
        showToast('That file is not a room save');
      }
    });
  });

  // ----- walk mode -----
  const walkBtn = $('btn-walk');
  walkBtn.addEventListener('click', () => game.toggleWalk());
  game.onModeChange = (mode) => {
    document.body.classList.toggle('walk-mode', mode === 'walk');
    walkBtn.classList.toggle('active', mode === 'walk');
    walkBtn.innerHTML = mode === 'walk' ? ICONS.door : ICONS.walk;
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
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
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
