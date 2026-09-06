/* Estado do projeto + persistência (localStorage) + desfazer/refazer. */
window.App = window.App || {};

App.Store = (function () {
  const KEY = 'plantabaixa.v1';
  const MAX_HIST = 60;

  const uid = () => Math.random().toString(36).slice(2, 10);

  function projetoExemplo() {
    const area = {
      id: uid(),
      name: 'Quarto',
      w: 2.56, h: 3.61, wall: 0.10,
      color: '#7c8cff',
      items: [
        { id: uid(), type: 'opening', kind: 'janela', wall: 'top', pos: 0.75, width: 1.00 },
        { id: uid(), type: 'opening', kind: 'porta', wall: 'right', pos: 2.55, width: 0.80, flip: false },
      ],
    };
    return { version: 1, name: 'Meu apartamento', areas: [area], activeId: area.id };
  }

  function normalizeArea(a) {
    a.id = a.id || uid();
    a.name = a.name || 'Área';
    a.w = +a.w || 3; a.h = +a.h || 3;
    a.wall = a.wall == null ? 0.10 : +a.wall;
    a.color = a.color || '#7c8cff';
    a.items = Array.isArray(a.items) ? a.items : [];
    a.items.forEach((i) => {
      i.id = i.id || uid();
      if (i.type === 'furniture') {
        if (i.shape !== 'circle') i.shape = 'rect';
        if (i.alt && (+i.alt.w > 0) && (+i.alt.h > 0)) {
          i.alt = { w: +i.alt.w, h: +i.alt.h };
          i.open = !!i.open;
        } else {
          delete i.alt;
          delete i.open;
        }
      }
    });
    return a;
  }

  function normalize(p) {
    if (!p || typeof p !== 'object') return projetoExemplo();
    const out = {
      version: 1,
      name: p.name || 'Meu apartamento',
      areas: (Array.isArray(p.areas) ? p.areas : []).map(normalizeArea),
      activeId: p.activeId || null,
    };
    if (!out.areas.length) return Object.assign(out, { areas: projetoExemplo().areas });
    if (!out.areas.some((a) => a.id === out.activeId)) out.activeId = out.areas[0].id;
    return out;
  }

  let project = null;
  let past = [], future = [], txSnapshot = null;
  const listeners = new Set();

  function snap() { return JSON.stringify(project); }

  function persist() {
    try { localStorage.setItem(KEY, snap()); } catch (e) { /* modo privado / cota */ }
  }

  function notify() { listeners.forEach((fn) => fn(project)); }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (raw) {
      try { project = normalize(JSON.parse(raw)); } catch (e) { project = projetoExemplo(); }
    } else {
      project = projetoExemplo();
    }
    past = []; future = [];
    persist();
    return project;
  }

  function pushHistory(before) {
    past.push(before);
    if (past.length > MAX_HIST) past.shift();
    future.length = 0;
  }

  /* Mutação normal: entra no histórico. */
  function update(fn) {
    const before = snap();
    fn(project);
    if (snap() === before) return project;
    pushHistory(before);
    persist(); notify();
    return project;
  }

  /* Mutações contínuas (arrastar): agrupa tudo num único passo de histórico. */
  function begin() { txSnapshot = snap(); }
  function live(fn) { fn(project); persist(); notify(); }
  function commit() {
    if (txSnapshot == null) return;
    if (snap() !== txSnapshot) pushHistory(txSnapshot);
    txSnapshot = null;
    persist(); notify();
  }
  function cancelTx() { txSnapshot = null; }

  function undo() {
    if (!past.length) return;
    future.push(snap());
    project = normalize(JSON.parse(past.pop()));
    persist(); notify();
  }
  function redo() {
    if (!future.length) return;
    past.push(snap());
    project = normalize(JSON.parse(future.pop()));
    persist(); notify();
  }

  function replace(p) {
    const before = snap();
    project = normalize(p);
    pushHistory(before);
    persist(); notify();
  }

  const get = () => project;
  const activeArea = () => project.areas.find((a) => a.id === project.activeId) || project.areas[0];
  const findItem = (id) => { const a = activeArea(); return a && a.items.find((i) => i.id === id); };
  const totalArea = () => project.areas.reduce((s, a) => s + a.w * a.h, 0);

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  return {
    uid, load, get, update, begin, live, commit, cancelTx, undo, redo, replace,
    subscribe, activeArea, findItem, totalArea, projetoExemplo,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
})();
