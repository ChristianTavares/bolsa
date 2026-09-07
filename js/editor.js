/* Canvas: transformação de vista, gestos (mouse + toque) e edição dos itens. */
window.App = window.App || {};

App.Editor = (function () {
  const G = App.geo, S = App.Store;

  const SNAP = 0.05;       // 5 cm
  const WALL_SNAP = 0.12;  // encosta na parede
  const ANG_SNAP = 15;     // graus

  let canvas, ctx, stage;
  let view = { scale: 100, ox: 0, oy: 0 };    // planta: ox/oy = origem do cômodo
  let viewF = { scale: 100, ox: 0, oy: 0 };   // vista frontal: oy = linha do piso
  let mode = 'plan';                          // 'plan' | 'front' | 'mob'
  let frontWall = 'top';
  let mapaLuz = true;                         // mostrar onde a luz bate
  let mobView = 'frente';                     // 'frente' | '3d'
  let viewM = { scale: 100, ox: 0, oy: 0 };   // móvel de frente
  let view3 = { scale: 100, cx: 0, cy: 0, yaw: -0.6, pitch: 0.32 };
  let selModulo = null;
  let tool = 'select';
  let selectedId = null;
  let draft = null;
  let handles = [];
  let cssW = 0, cssH = 0;
  let onChange = () => {};
  let onHint = () => {};
  let raf = 0;

  const pointers = new Map();
  let gesture = null;
  let pinch = null;

  const area = () => S.activeArea();
  const V = () => (mode === 'plan' ? view : mode === 'front' ? viewF : viewM);
  const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale });
  /* Tela -> (s ao longo da parede, z altura) na vista frontal. */
  const toElev = (sx, sy) => ({ s: (sx - viewF.ox) / viewF.scale, z: (viewF.oy - sy) / viewF.scale });

  /* ---------- render loop ---------- */
  function resize() {
    const r = stage.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (mode === 'mob') {
        handles = [];
        const m = S.activeMovel();
        if (!m) return;
        if (mobView === '3d') App.marcenaria.desenha3D(ctx, m, view3, cssW, cssH, {});
        else App.marcenaria.desenhaFrente(ctx, m, viewM, cssW, cssH, { selecionado: selModulo });
        return;
      }
      if (mode === 'front') {
        handles = [];
        App.elev.render(ctx, {
          area: area(), wall: frontWall, view: viewF,
          width: cssW, height: cssH, selectedId,
        });
        return;
      }
      handles = App.render(ctx, {
        area: area(), view, width: cssW, height: cssH,
        selectedId, draft, mapaLuz,
      });
    });
  }

  function fit() {
    if (!cssW) return;
    const pad = 70;
    if (mode === 'mob') {
      const m = S.activeMovel();
      if (!m) return;
      if (mobView === '3d') {
        const diag = Math.hypot(m.w, m.h) * 0.85 + m.d * 0.4;
        view3.scale = G.clamp(Math.min(cssW - pad * 2, cssH - pad * 2) / Math.max(0.5, diag), 10, 600);
        view3.cx = cssW / 2; view3.cy = cssH / 2;
      } else {
        const s = Math.min((cssW - pad * 2.4) / m.w, (cssH - pad * 2.4) / m.h);
        viewM.scale = G.clamp(s, 8, 600);
        viewM.ox = cssW / 2 - (m.w / 2) * viewM.scale;
        viewM.oy = cssH / 2 + (m.h / 2) * viewM.scale;
      }
      draw();
      return;
    }
    const a = area();
    if (!a) return;
    if (mode === 'front') {
      const L = App.elev.run(a, frontWall);
      const s = Math.min((cssW - pad * 2) / L, (cssH - pad * 2) / a.pd);
      viewF.scale = G.clamp(s, 4, 600);
      viewF.ox = cssW / 2 - (L / 2) * viewF.scale;
      viewF.oy = cssH / 2 + (a.pd / 2) * viewF.scale;
      draw();
      return;
    }
    const w = a.w + 2 * a.wall, h = a.h + 2 * a.wall;
    const s = Math.min((cssW - pad * 2) / w, (cssH - pad * 2) / h);
    view.scale = G.clamp(s, 4, 600);
    view.ox = cssW / 2 - (a.w / 2) * view.scale;
    view.oy = cssH / 2 - (a.h / 2) * view.scale;
    draw();
  }

  function zoomAt(factor, sx, sy) {
    if (mode === 'mob' && mobView === '3d') {
      view3.scale = G.clamp(view3.scale * factor, 10, 900);
      draw();
      return;
    }
    const v = V();
    const k = G.clamp(v.scale * factor, 6, 800) / v.scale;
    v.scale *= k;
    v.ox = sx - (sx - v.ox) * k;
    v.oy = sy - (sy - v.oy) * k;
    draw();
  }

  /* ---------- seleção ---------- */
  function select(id) {
    if (selectedId === id) return;
    selectedId = id;
    draw();
    onChange();
  }
  const getSelected = () => { const a = area(); return a && a.items.find((i) => i.id === selectedId); };

  function hitHandle(sx, sy) {
    for (const h of handles) {
      if (Math.hypot(sx - h.sx, sy - h.sy) <= (h.r || 9) + 8) return h;
    }
    return null;
  }

  function hitItem(wx, wy) {
    const a = area();
    if (!a) return null;
    const tol = 12 / view.scale;
    const ordered = a.items.slice().reverse();
    for (const it of ordered) {
      if (it.type === 'light' && Math.hypot(wx - it.x, wy - it.y) <= 0.14 + tol) return it;
    }
    for (const it of ordered) {
      if (it.type === 'line' &&
          G.distToSegment(wx, wy, it.x1, it.y1, it.x2, it.y2) <= tol) return it;
    }
    for (const it of ordered) {
      if (it.type === 'furniture' && G.pointInItem(wx, wy, it, 0)) return it;
    }
    for (const it of ordered) {
      if (it.type === 'opening') {
        const g = App.render.openingGeom(a, it);
        if (wx >= g.rect.x1 - tol && wx <= g.rect.x2 + tol &&
            wy >= g.rect.y1 - tol && wy <= g.rect.y2 + tol) return it;
      }
    }
    return null;
  }

  function hitAlcaElev(px, py) {
    const it = getSelected();
    if (!it || it.type !== 'furniture') return null;
    const hs = App.elev.alcas(area(), frontWall, it, viewF);
    for (const h of hs) if (Math.hypot(px - h.sx, py - h.sy) <= 17) return h;
    return null;
  }

  /* Item sob o ponto na vista frontal (da frente para o fundo). */
  function hitElev(px, py) {
    const a = area();
    if (!a) return null;
    const { s, z } = toElev(px, py);
    const tol = 8 / viewF.scale;
    const lista = App.elev.pecas(a, frontWall).slice().reverse();
    for (const p of lista) {
      if (s >= p.s1 - tol && s <= p.s2 + tol && z >= p.z1 - tol && z <= p.z2 + tol) return p.it;
    }
    for (const p of App.elev.vaos(a, frontWall)) {
      if (s >= p.s1 - tol && s <= p.s2 + tol && z >= p.z1 - tol && z <= p.z2 + tol) return p.it;
    }
    return null;
  }

  /* Módulo do móvel sob o ponto, na vista de frente. */
  function hitModulo(px, py) {
    const m = S.activeMovel();
    if (!m) return null;
    const x = (px - viewM.ox) / viewM.scale;
    const y = (viewM.oy - py) / viewM.scale;
    if (y < 0 || y > m.h) return null;
    const offs = App.marcenaria.offsets(m);
    for (let i = 0; i < m.modulos.length; i++) {
      if (x >= offs[i] && x <= offs[i] + m.modulos[i].larg) return m.modulos[i];
    }
    return null;
  }

  /* ---------- snapping ---------- */
  function snapFurniture(it) {
    it.x = G.snap(it.x, SNAP);
    it.y = G.snap(it.y, SNAP);
    const a = area();
    const b = G.bbox(it);
    if (b.x1 > -WALL_SNAP && b.x1 < WALL_SNAP) it.x += -b.x1;
    if (Math.abs(b.x2 - a.w) < WALL_SNAP) it.x += a.w - b.x2;
    if (b.y1 > -WALL_SNAP && b.y1 < WALL_SNAP) it.y += -b.y1;
    if (Math.abs(b.y2 - a.h) < WALL_SNAP) it.y += a.h - b.y2;
  }

  /* Mantém o móvel dentro do cômodo (se couber). */
  function keepInside(it, a) {
    const b = G.bbox(it);
    const bw = b.x2 - b.x1, bh = b.y2 - b.y1;
    it.x = bw <= a.w ? G.clamp(it.x, bw / 2, a.w - bw / 2) : a.w / 2;
    it.y = bh <= a.h ? G.clamp(it.y, bh / 2, a.h - bh / 2) : a.h / 2;
    it.x = Math.round(it.x * 1000) / 1000;
    it.y = Math.round(it.y * 1000) / 1000;
  }

  function snapPoint(p) {
    return { x: G.snap(p.x, SNAP), y: G.snap(p.y, SNAP) };
  }

  function nearestWall(wx, wy) {
    const a = area();
    const d = {
      top: Math.abs(wy), bottom: Math.abs(a.h - wy),
      left: Math.abs(wx), right: Math.abs(a.w - wx),
    };
    return Object.keys(d).sort((k1, k2) => d[k1] - d[k2])[0];
  }

  /* ---------- criação de itens ---------- */
  const ROT_PAREDE = { top: 0, right: 90, bottom: 180, left: 270 };

  /* (posição ao longo da parede, distância até ela) -> ponto do plano. */
  function planoDeParede(s, dist) {
    const a = area();
    if (frontWall === 'top') return { x: s, y: dist };
    if (frontWall === 'bottom') return { x: a.w - s, y: a.h - dist };
    if (frontWall === 'left') return { x: dist, y: a.h - s };
    return { x: a.w - dist, y: s };
  }

  function centerOfView() {
    const a = area();
    if (mode === 'front') {
      const s = G.clamp((cssW / 2 - viewF.ox) / viewF.scale, 0, App.elev.run(a, frontWall));
      return planoDeParede(s, 0.3);
    }
    const c = toWorld(cssW / 2, cssH / 2);
    return { x: G.clamp(c.x, 0, a.w), y: G.clamp(c.y, 0, a.h) };
  }

  function addFurniture(p) {
    const a = area();
    if (!a) return;
    const c = centerOfView();
    const it = {
      id: S.uid(), type: 'furniture', name: p.nome,
      shape: p.forma === 'circle' ? 'circle' : 'rect',
      w: Math.min(p.w, a.w), h: Math.min(p.h, a.h),
      x: G.clamp(c.x, p.w / 2, Math.max(p.w / 2, a.w - p.w / 2)),
      y: G.clamp(c.y, p.h / 2, Math.max(p.h / 2, a.h - p.h / 2)),
      rot: 0, color: p.cor || '#e2e5ec',
      altura: p.altura > 0 ? p.altura : 0.75,
      base: p.base >= 0 ? p.base : 0,
    };
    if (p.alt && p.alt.w > 0 && p.alt.h > 0) {
      it.alt = { w: p.alt.w, h: p.alt.h };
      it.open = false;
    }
    if (mode === 'front') {
      // entra encostado na parede que está sendo vista, no meio do que se enxerga
      it.rot = ROT_PAREDE[frontWall];
      const s = G.clamp((cssW / 2 - viewF.ox) / viewF.scale, 0, App.elev.run(a, frontWall));
      const pos = planoDeParede(s, it.h / 2);
      it.x = pos.x; it.y = pos.y;
      keepInside(it, a);
    }
    S.update(() => { a.items.push(it); });
    select(it.id);
    onHint(mode === 'front'
      ? p.nome + ' na parede ' + App.elev.NOMES[frontWall]
        + ' — arraste para posicionar, alças mudam a medida'
      : p.nome + ' adicionado — ' + (it.alt
        ? 'toque nele de novo para abrir'
        : 'arraste na planta ou mude a medida na aba Editar'));
  }

  function addLight(p) {
    const a = area();
    if (!a) return;
    const c = centerOfView();
    const it = {
      id: S.uid(), type: 'light',
      kind: p.kind === 'principal' ? 'principal' : 'spot',
      name: p.nome, lumens: p.lumens,
      watts: p.watts || Math.round(p.lumens / 90),
      dim: 100,
      beam: p.beam || 120,
      k: p.k || 4000,
      base: p.altura > 0 ? p.altura : a.pd,
      x: G.snap(G.clamp(c.x, 0.15, a.w - 0.15), SNAP),
      y: G.snap(G.clamp(c.y, 0.15, a.h - 0.15), SNAP),
    };
    S.update(() => { a.items.push(it); });
    select(it.id);
    onHint(p.nome + ' · ' + p.lumens + ' lm — arraste para posicionar no teto');
  }

  function addOpening(kind, wall, posCenter) {
    const a = area();
    const width = kind === 'porta' ? 0.80 : 1.00;
    const run = (wall === 'top' || wall === 'bottom') ? a.w : a.h;
    const it = {
      id: S.uid(), type: 'opening', kind, wall,
      width: Math.min(width, run),
      pos: G.clamp(G.snap(posCenter - width / 2, SNAP), 0, Math.max(0, run - width)),
      flip: false, out: false,
    };
    S.update(() => { a.items.push(it); });
    select(it.id);
    return it;
  }

  /* Abre/fecha um móvel de dois tamanhos (sofá-cama, mesa extensível…).
     O encosto fica parado: a peça cresce para a frente. */
  function toggleOpen(id) {
    const a = area();
    const it = id ? a.items.find((i) => i.id === id) : getSelected();
    if (!it || it.type !== 'furniture' || !it.alt) return false;
    let falta = 0;
    S.update(() => {
      const atual = { w: it.w, h: it.h };
      const outro = { w: it.alt.w, h: it.alt.h };
      const frente = G.rot(0, 1, 0, 0, it.rot || 0);
      it.x += frente.x * (outro.h - atual.h) / 2;
      it.y += frente.y * (outro.h - atual.h) / 2;
      it.w = outro.w; it.h = outro.h;
      it.alt = atual;
      it.open = !it.open;
      const b = G.bbox(it);
      falta = Math.max(0, (b.x2 - b.x1) - a.w, (b.y2 - b.y1) - a.h);
      keepInside(it, a);
    });
    let msg = (it.name || 'Móvel') + (it.open ? ' aberto: ' : ' fechado: ')
      + G.num(it.w) + ' × ' + G.num(it.h) + ' m';
    if (falta > 0.005) msg += ' — não cabe, faltam ' + Math.round(falta * 100) + ' cm';
    onHint(msg);
    draw();
    return true;
  }

  /* Toque numa porta já selecionada percorre as 4 combinações:
     dobradiça de um lado ou do outro × abrir para dentro ou para fora. */
  function cycleDoor(id) {
    const a = area();
    const it = id ? a.items.find((i) => i.id === id) : getSelected();
    if (!it || it.type !== 'opening' || it.kind !== 'porta') return false;
    S.update(() => {
      const n = (((it.flip ? 1 : 0) + (it.out ? 2 : 0)) + 1) % 4;
      it.flip = !!(n & 1);
      it.out = !!(n & 2);
    });
    onHint('Porta: ' + G.descricaoPorta(it));
    draw();
    return true;
  }

  function removeSelected() {
    const a = area();
    if (!a || !selectedId) return;
    S.update(() => { a.items = a.items.filter((i) => i.id !== selectedId); });
    select(null);
  }

  function duplicateSelected() {
    const a = area(), it = getSelected();
    if (!it) return;
    const copy = JSON.parse(JSON.stringify(it));
    copy.id = S.uid();
    if (copy.type === 'furniture') { copy.x += 0.2; copy.y += 0.2; }
    if (copy.type === 'line') { copy.x1 += 0.2; copy.x2 += 0.2; copy.y1 += 0.2; copy.y2 += 0.2; }
    if (copy.type === 'opening') { copy.pos += 0.2; }
    S.update(() => { a.items.push(copy); });
    select(copy.id);
  }

  /* ---------- gestos ---------- */
  function localPos(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function startPinch() {
    const pts = [...pointers.values()];
    pinch = {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
    };
  }

  function onDown(ev) {
    canvas.setPointerCapture(ev.pointerId);
    const p = localPos(ev);
    pointers.set(ev.pointerId, p);

    if (pointers.size === 2) {
      if (gesture && gesture.tx) S.commit();
      gesture = null; draft = null;
      startPinch();
      return;
    }
    if (pointers.size > 2) return;

    const a = area();
    if (!a) return;

    if (mode === 'mob') {
      if (mobView === '3d') {
        gesture = { type: 'orbit', start: p, origem: { yaw: view3.yaw, pitch: view3.pitch }, moved: false };
        return;
      }
      const mo = hitModulo(p.x, p.y);
      if (mo) {
        selModulo = mo.id;
        draw();
        onChange();
      } else {
        selModulo = null;
        draw();
        onChange();
      }
      gesture = { type: 'pan', start: p, origin: { ox: viewM.ox, oy: viewM.oy }, moved: false, hitEmpty: false };
      return;
    }

    if (mode === 'front') {
      const alca = hitAlcaElev(p.x, p.y);
      if (alca) {
        S.begin();
        gesture = {
          type: 'elevh', handle: alca, tx: true, start: p, moved: false,
          orig: JSON.parse(JSON.stringify(getSelected())),
        };
        return;
      }
      const alvo = hitElev(p.x, p.y);
      if (alvo) {
        const jaEstava = selectedId === alvo.id;
        select(alvo.id);
        S.begin();
        gesture = {
          type: 'elev', id: alvo.id, tx: true, start: p, moved: false, wasSelected: jaEstava,
          grab: toElev(p.x, p.y), orig: JSON.parse(JSON.stringify(alvo)),
        };
        return;
      }
      gesture = { type: 'pan', start: p, origin: { ox: viewF.ox, oy: viewF.oy }, moved: false, hitEmpty: true };
      return;
    }

    const w = toWorld(p.x, p.y);

    if (tool === 'line') {
      const sp = snapPoint(w);
      draft = { x1: sp.x, y1: sp.y, x2: sp.x, y2: sp.y };
      gesture = { type: 'line', start: p };
      draw();
      return;
    }
    if (tool === 'door' || tool === 'window') {
      const wall = nearestWall(w.x, w.y);
      const along = (wall === 'top' || wall === 'bottom') ? w.x : w.y;
      const nova = addOpening(tool === 'door' ? 'porta' : 'janela', wall, along);
      setTool('select');
      onHint(nova.kind === 'porta'
        ? 'Porta: arraste na parede; toque nela de novo para virar o lado que abre'
        : 'Janela: arraste para posicionar na parede');
      return;
    }

    const h = hitHandle(p.x, p.y);
    if (h && getSelected()) {
      S.begin();
      gesture = { type: 'handle', handle: h, tx: true, start: p, moved: false,
                  orig: JSON.parse(JSON.stringify(getSelected())) };
      return;
    }

    const it = hitItem(w.x, w.y);
    if (it) {
      const jaEstava = selectedId === it.id;
      select(it.id);
      S.begin();
      gesture = {
        type: 'item', id: it.id, tx: true, start: p, moved: false,
        wasSelected: jaEstava,
        grab: { x: w.x, y: w.y },
        orig: JSON.parse(JSON.stringify(it)),
      };
      return;
    }

    gesture = { type: 'pan', start: p, origin: { ox: view.ox, oy: view.oy }, moved: false, hitEmpty: true };
  }

  /* Alças da vista: laterais mudam a medida ao longo da parede, a de cima muda a altura. */
  function resizeElev(p) {
    const a = area(), it = getSelected();
    if (!it) return;
    const o = gesture.orig, k = gesture.handle.kind;
    const cur = toElev(p.x, p.y);
    S.live(() => {
      if (k === 'topo') {
        it.altura = Math.max(0.02, G.snap(cur.z - it.base, SNAP));
        return;
      }
      const r = App.elev.sRange(a, frontWall, G.bbox(o));
      const horiz = frontWall === 'top' || frontWall === 'bottom';
      const cos = Math.abs(Math.cos(G.d2r(o.rot || 0)));
      const sin = Math.abs(Math.sin(G.d2r(o.rot || 0)));
      const larguraEhW = horiz ? cos > 0.5 : sin > 0.5;
      const alvo = G.clamp(G.snap(cur.s, SNAP), 0, App.elev.run(a, frontWall));
      const nova = Math.max(0.05, k === 'dir' ? alvo - r.s1 : r.s2 - alvo);
      if (larguraEhW) it.w = nova; else it.h = nova;
      const cs = k === 'dir' ? r.s1 + nova / 2 : r.s2 - nova / 2;
      const dist = App.elev.sPoint(a, frontWall, o.x, o.y).d;
      const pos = planoDeParede(cs, dist);
      it.x = G.snap(pos.x, SNAP); it.y = G.snap(pos.y, SNAP);
      keepInside(it, a);
    });
    const f = App.elev.folgas(a, frontWall, it);
    onHint(`${it.name}: ${G.m(f.s2 - f.s1)} de largura · altura ${G.m(it.altura)}`
      + (f.dir > 0.005 ? ' · sobra ' + G.m(f.dir) : ''));
  }

  /* Arraste na vista frontal: horizontal anda pela parede, vertical muda a altura do chão. */
  function moveElev(p) {
    const a = area(), it = getSelected();
    if (!it) return;
    const o = gesture.orig;
    const cur = toElev(p.x, p.y);
    const ds = cur.s - gesture.grab.s, dz = cur.z - gesture.grab.z;
    S.live(() => {
      const d = App.elev.moveBy(frontWall, ds);
      if (it.type === 'furniture') {
        it.x = G.snap(o.x + d.dx, SNAP); it.y = G.snap(o.y + d.dy, SNAP);
        keepInside(it, a);
        it.base = G.clamp(G.snap(o.base + dz, SNAP), 0, Math.max(0, a.pd - 0.05));
      } else if (it.type === 'light') {
        it.x = G.clamp(G.snap(o.x + d.dx, SNAP), 0, a.w);
        it.y = G.clamp(G.snap(o.y + d.dy, SNAP), 0, a.h);
      } else if (it.type === 'opening') {
        const sinal = (frontWall === 'top' || frontWall === 'right') ? 1 : -1;
        const run = (it.wall === 'top' || it.wall === 'bottom') ? a.w : a.h;
        it.pos = G.clamp(G.snap(o.pos + sinal * ds, SNAP), 0, Math.max(0, run - it.width));
        it.base = G.clamp(G.snap(o.base + dz, SNAP), 0, Math.max(0, a.pd - it.altura));
      }
    });
    const fo = it.type === 'furniture' ? App.elev.folgas(a, frontWall, it) : null;
    onHint(it.type === 'furniture'
      ? it.name + ': base ' + G.m(it.base)
        + (fo.esq > 0.005 ? ' · sobra ' + G.m(fo.esq) + ' à esquerda' : '')
        + (fo.dir > 0.005 ? ' · ' + G.m(fo.dir) + ' à direita' : '')
      : it.type === 'opening'
        ? (it.kind === 'porta' ? 'Porta' : 'Janela') + ': peitoril ' + G.m(it.base)
        : itemHint(it));
  }

  function onMove(ev) {
    if (!pointers.has(ev.pointerId)) return;
    const p = localPos(ev);
    pointers.set(ev.pointerId, p);

    if (pointers.size >= 2 && pinch) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (pinch.dist > 0) {
        const before = toWorld(mid.x, mid.y);
        view.scale = G.clamp(view.scale * (dist / pinch.dist), 6, 800);
        view.ox = mid.x - before.x * view.scale;
        view.oy = mid.y - before.y * view.scale;
      }
      view.ox += mid.x - pinch.mid.x;
      view.oy += mid.y - pinch.mid.y;
      pinch = { dist, mid };
      draw();
      return;
    }

    if (!gesture) return;
    const w = toWorld(p.x, p.y);
    const dist = Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y);
    gesture.maxMove = Math.max(gesture.maxMove || 0, dist);
    if (dist > 5) gesture.moved = true;

    if (gesture.type === 'pan') {
      const v = V();
      v.ox = gesture.origin.ox + (p.x - gesture.start.x);
      v.oy = gesture.origin.oy + (p.y - gesture.start.y);
      draw();
      return;
    }
    if (gesture.type === 'elev') { moveElev(p); return; }
    if (gesture.type === 'elevh') { resizeElev(p); return; }
    if (gesture.type === 'orbit') {
      view3.yaw = gesture.origem.yaw + (p.x - gesture.start.x) * 0.01;
      view3.pitch = G.clamp(gesture.origem.pitch + (p.y - gesture.start.y) * 0.008, -1.2, 1.2);
      draw();
      return;
    }
    if (gesture.type === 'line') {
      let sp = snapPoint(w);
      const dx = sp.x - draft.x1, dy = sp.y - draft.y1;
      const ang = G.r2d(Math.atan2(dy, dx));
      const snapped = Math.round(ang / ANG_SNAP) * ANG_SNAP;
      if (Math.abs(snapped - ang) < 6) {
        const len = Math.hypot(dx, dy);
        sp = { x: draft.x1 + Math.cos(G.d2r(snapped)) * len, y: draft.y1 + Math.sin(G.d2r(snapped)) * len };
      }
      draft.x2 = sp.x; draft.y2 = sp.y;
      onHint('Comprimento: ' + G.m(Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1)));
      draw();
      return;
    }
    if (gesture.type === 'item') { moveItem(w); return; }
    if (gesture.type === 'handle') { dragHandle(w, p); return; }
  }

  function moveItem(w) {
    const a = area(), it = getSelected();
    if (!it) return;
    const o = gesture.orig;
    const dx = w.x - gesture.grab.x, dy = w.y - gesture.grab.y;
    S.live(() => {
      if (it.type === 'furniture') {
        it.x = o.x + dx; it.y = o.y + dy;
        snapFurniture(it);
        keepInside(it, a);
      } else if (it.type === 'line') {
        it.x1 = G.snap(o.x1 + dx, SNAP); it.y1 = G.snap(o.y1 + dy, SNAP);
        it.x2 = G.snap(o.x2 + dx, SNAP); it.y2 = G.snap(o.y2 + dy, SNAP);
      } else if (it.type === 'opening') {
        const horiz = (it.wall === 'top' || it.wall === 'bottom');
        const run = horiz ? a.w : a.h;
        it.pos = G.clamp(G.snap(o.pos + (horiz ? dx : dy), SNAP), 0, Math.max(0, run - it.width));
      } else if (it.type === 'light') {
        it.x = G.clamp(G.snap(o.x + dx, SNAP), 0, a.w);
        it.y = G.clamp(G.snap(o.y + dy, SNAP), 0, a.h);
      }
    });
    onHint(itemHint(it));
  }

  function dragHandle(w, p) {
    const a = area(), it = getSelected();
    if (!it) return;
    const k = gesture.handle.kind, o = gesture.orig;

    S.live(() => {
      if (it.type === 'line') {
        const sp = snapPoint(w);
        if (k === 'p1') { it.x1 = sp.x; it.y1 = sp.y; } else { it.x2 = sp.x; it.y2 = sp.y; }
        return;
      }
      if (it.type === 'opening') {
        const horiz = (it.wall === 'top' || it.wall === 'bottom');
        const run = horiz ? a.w : a.h;
        const along = G.clamp(G.snap(horiz ? w.x : w.y, SNAP), 0, run);
        const end = o.pos + o.width;
        if (k === 'o1') {
          const pos = Math.min(along, end - 0.2);
          it.pos = Math.max(0, pos); it.width = end - it.pos;
        } else {
          it.width = G.clamp(along - o.pos, 0.2, run - o.pos);
        }
        return;
      }
      if (k === 'rotate') {
        const ang = G.r2d(Math.atan2(w.y - it.y, w.x - it.x)) + 90;
        const snapped = Math.round(ang / ANG_SNAP) * ANG_SNAP;
        it.rot = Math.abs(snapped - ang) < 7 ? ((snapped % 360) + 360) % 360 : ((ang % 360) + 360) % 360;
        it.rot = Math.round(it.rot * 10) / 10;
        return;
      }
      // redimensionar por um canto: o canto oposto fica fixo
      const idx = gesture.handle.i;
      const cs = G.corners(o);
      const fixed = cs[(idx + 2) % 4];
      const d = G.rot(w.x, w.y, fixed.x, fixed.y, -(o.rot || 0));
      let nw = Math.abs(d.x - fixed.x), nh = Math.abs(d.y - fixed.y);
      nw = Math.max(0.1, G.snap(nw, SNAP));
      nh = Math.max(0.1, G.snap(nh, SNAP));
      const sx = Math.sign(d.x - fixed.x) || 1, sy = Math.sign(d.y - fixed.y) || 1;
      const localCenter = { x: fixed.x + sx * nw / 2, y: fixed.y + sy * nh / 2 };
      const c = G.rot(localCenter.x, localCenter.y, fixed.x, fixed.y, o.rot || 0);
      it.w = nw; it.h = nh; it.x = c.x; it.y = c.y;
    });
    void p;
    onHint(itemHint(it));
  }

  function itemHint(it) {
    if (!it) return '';
    if (it.type === 'furniture') return it.name + ': ' + G.num(it.w) + ' × ' + G.num(it.h) + ' m · ' + Math.round(it.rot || 0) + '°';
    if (it.type === 'line') return 'Linha: ' + G.m(Math.hypot(it.x2 - it.x1, it.y2 - it.y1));
    if (it.type === 'opening') return (it.kind === 'porta' ? 'Porta' : 'Janela') + ': ' + G.m(it.width);
    if (it.type === 'light') return it.name + ': ' + it.lumens + ' lm';
    return '';
  }

  function onUp(ev) {
    pointers.delete(ev.pointerId);
    try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* ignore */ }

    if (pointers.size === 1) { pinch = null; startPanFromRemaining(); return; }
    if (pointers.size > 0) return;
    pinch = null;

    if (gesture) {
      if (gesture.type === 'line' && draft) {
        const len = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
        const a = area();
        if (len >= 0.1) {
          const l = { id: S.uid(), type: 'line', x1: draft.x1, y1: draft.y1, x2: draft.x2, y2: draft.y2 };
          S.update(() => { a.items.push(l); });
          select(l.id);
          onHint('Linha de ' + G.m(len) + ' criada');
        }
        draft = null;
        setTool('select');
      } else if (gesture.tx) {
        // toque curto num item já selecionado = abrir/fechar (tolera o tremido do dedo)
        const toque = (gesture.type === 'item' || gesture.type === 'elev')
          && gesture.wasSelected && (gesture.maxMove || 0) <= 8;
        if (toque) {
          const it = getSelected(), o = gesture.orig;
          if (it && it.type === 'furniture') S.live(() => { it.x = o.x; it.y = o.y; it.base = o.base; });
          if (it && it.type === 'opening') S.live(() => { it.pos = o.pos; it.base = o.base; });
          if (it && it.type === 'light') S.live(() => { it.x = o.x; it.y = o.y; });
        }
        S.commit();
        if (toque) { toggleOpen(gesture.id) || cycleDoor(gesture.id); }
        onChange();
      } else if (gesture.type === 'pan' && !gesture.moved && gesture.hitEmpty) {
        select(null);
      }
    }
    gesture = null;
    draw();
  }

  function startPanFromRemaining() {
    const p = [...pointers.values()][0];
    gesture = { type: 'pan', start: p, origin: { ox: view.ox, oy: view.oy }, moved: true, hitEmpty: false };
  }

  function onWheel(ev) {
    ev.preventDefault();
    const p = localPos(ev);
    const f = Math.pow(0.999, ev.deltaY * (ev.deltaMode === 1 ? 16 : 1));
    zoomAt(f, p.x, p.y);
  }

  function onKey(ev) {
    const tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    const it = getSelected();
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && it) { ev.preventDefault(); removeSelected(); return; }
    if (ev.key === 'Escape') { draft = null; setTool('select'); select(null); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      if (ev.shiftKey) S.redo(); else S.undo();
      return;
    }
    if (it && it.type === 'furniture' && ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      const step = ev.shiftKey ? 0.01 : SNAP;
      S.update(() => {
        if (ev.key === 'ArrowLeft') it.x -= step;
        if (ev.key === 'ArrowRight') it.x += step;
        if (ev.key === 'ArrowUp') it.y -= step;
        if (ev.key === 'ArrowDown') it.y += step;
        it.x = Math.round(it.x * 1000) / 1000;
        it.y = Math.round(it.y * 1000) / 1000;
      });
    }
  }

  /* ---------- exportar PNG ---------- */
  function exportPNG(filename) {
    if (mode === 'mob') return exportMovelPNG(filename);
    const a = area();
    if (!a) return;
    const pad = 90;
    const scale = 140;
    const frente = mode === 'front';
    const L = frente ? App.elev.run(a, frontWall) : a.w + 2 * a.wall;
    const A = frente ? a.pd : a.h + 2 * a.wall;
    const W = Math.round(L * scale + pad * 2);
    const H = Math.round(A * scale + pad * 2);
    const c = document.createElement('canvas');
    const dpr = 2;
    c.width = W * dpr; c.height = H * dpr;
    const cx = c.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (frente) {
      App.elev.render(cx, {
        area: a, wall: frontWall, width: W, height: H, selectedId: null, exportMode: true,
        view: { scale, ox: pad, oy: pad + a.pd * scale },
      });
    } else {
      App.render(cx, {
        area: a, width: W, height: H, selectedId: null, exportMode: true, mapaLuz,
        view: { scale, ox: pad + a.wall * scale, oy: pad + a.wall * scale },
      });
    }
    const base = filename || (a.name.replace(/\s+/g, '-').toLowerCase()
      + (frente ? '-parede-' + App.elev.NOMES[frontWall] : '-planta'));
    App.exportar.salvarCanvas(c, base + '.png', onHint);
  }

  function exportMovelPNG(filename) {
    const m = S.activeMovel();
    if (m) App.exportar.movel(m, filename, onHint);
  }

  /* ---------- API ---------- */
  function setMovelView(v) {
    mobView = v === '3d' ? '3d' : 'frente';
    fit();
    onChange();
  }

  function selecionarModulo(id) {
    selModulo = id;
    draw();
    onChange();
  }

  function setMapaLuz(v) {
    mapaLuz = !!v;
    draw();
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (mode === 'front') setTool('select');
    draft = null;
    fit();
    onChange();
  }

  function setFrontWall(w) {
    frontWall = w;
    fit();
    onChange();
  }

  function girarParede(passo) {
    const i = App.elev.ORDEM.indexOf(frontWall);
    setFrontWall(App.elev.ORDEM[(i + passo + 4) % 4]);
  }

  function setTool(t) {
    if (mode === 'front') t = 'select';
    tool = t;
    document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('is-active', b.dataset.tool === t));
    if (t === 'line') onHint('Arraste dentro do cômodo para desenhar a linha');
    if (t === 'door') onHint('Toque na parede onde fica a porta');
    if (t === 'window') onHint('Toque na parede onde fica a janela');
    canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
  }

  function init(opts) {
    canvas = opts.canvas; stage = opts.stage;
    ctx = canvas.getContext('2d');
    onChange = opts.onChange || onChange;
    onHint = opts.onHint || onHint;

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

    resize();
    fit();
  }

  return {
    init, draw, fit, resize, setTool, select, getSelected, addFurniture, addOpening, addLight,
    keepInside, toggleOpen, cycleDoor, setMode, setFrontWall, girarParede, setMapaLuz,
    setMovelView, selecionarModulo,
    removeSelected, duplicateSelected, exportPNG, zoomAt,
    zoomIn: () => zoomAt(1.25, cssW / 2, cssH / 2),
    zoomOut: () => zoomAt(0.8, cssW / 2, cssH / 2),
    get selectedId() { return selectedId; },
    get tool() { return tool; },
    get mode() { return mode; },
    get mapaLuz() { return mapaLuz; },
    get mobView() { return mobView; },
    get selModulo() { return selModulo; },
    get frontWall() { return frontWall; },
  };
})();
