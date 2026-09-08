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
    a.pd = +a.pd > 0 ? +a.pd : 2.60;          // pé-direito
    a.tipo = a.tipo || 'Sala de estar';
    a.lux = +a.lux > 0 ? +a.lux : 150;        // lux alvo do ambiente
    a.refl = ['claras', 'medias', 'escuras', 'nenhuma'].indexOf(a.refl) >= 0 ? a.refl : 'claras';
    a.items = Array.isArray(a.items) ? a.items : [];
    a.items.forEach((i) => {
      i.id = i.id || uid();
      if (i.type === 'opening') {
        i.flip = !!i.flip;
        i.out = !!i.out;
        const porta = i.kind === 'porta';
        i.altura = +i.altura > 0 ? +i.altura : (porta ? 2.10 : 1.20);
        i.base = +i.base >= 0 ? +i.base : (porta ? 0 : 1.10);
      }
      if (i.type === 'light') {
        i.kind = i.kind === 'principal' ? 'principal' : 'spot';
        i.name = i.name || (i.kind === 'principal' ? 'Luz principal' : 'Spot');
        i.lumens = +i.lumens > 0 ? +i.lumens : 600;
        i.watts = +i.watts > 0 ? +i.watts : Math.round(i.lumens / 90);
        i.dim = +i.dim >= 0 && +i.dim <= 100 ? +i.dim : 100;
        i.beam = +i.beam > 0 ? Math.min(170, +i.beam) : 120;
        i.k = +i.k > 0 ? +i.k : 4000;
        i.base = +i.base > 0 ? +i.base : a.pd;   // altura de instalação
        i.pas = +i.pas > 0 ? +i.pas : 0;         // raio das pás, quando é ventilador
        i.x = +i.x || 0; i.y = +i.y || 0;
      }
      if (i.type === 'furniture') {
        i.altura = +i.altura > 0 ? +i.altura : 0.75;
        i.base = +i.base >= 0 ? +i.base : 0;
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

  function normalizeMovel(m) {
    const M = App.marcenaria;
    const base = M.novoMovel(m.id || uid());
    const out = Object.assign(base, {
      id: m.id || base.id,
      nome: m.nome || base.nome,
      w: +m.w > 0 ? +m.w : base.w,
      d: +m.d > 0 ? +m.d : base.d,
      h: +m.h > 0 ? +m.h : base.h,
      rodape: +m.rodape >= 0 ? +m.rodape : base.rodape,
      esp: +m.esp > 0 ? +m.esp : base.esp,
      cor: m.cor || base.cor,
      obs: m.obs || '',
    });
    if (Array.isArray(m.modulos) && m.modulos.length) {
      out.modulos = m.modulos.map((mo, i) => ({
        id: mo.id || uid() + i,
        larg: +mo.larg > 0 ? +mo.larg : 0.6,
        tipo: M.TIPOS[mo.tipo] ? mo.tipo : 'prateleiras',
        qtd: Math.max(0, Math.min(12, Math.round(+mo.qtd || 0))),
        portas: Math.max(0, Math.min(2, Math.round(+mo.portas || 0))),
        armario: Math.max(0, Math.min(2.5, +mo.armario || 0)),
        portasArmario: Math.max(1, Math.min(2, Math.round(+mo.portasArmario || 2))),
      }));
    }
    return out;
  }

  function normalize(p) {
    if (!p || typeof p !== 'object') return projetoExemplo();
    const out = {
      version: 1,
      name: p.name || 'Meu apartamento',
      areas: (Array.isArray(p.areas) ? p.areas : []).map(normalizeArea),
      activeId: p.activeId || null,
      moveis: (Array.isArray(p.moveis) ? p.moveis : []).map(normalizeMovel),
      movelId: p.movelId || null,
    };
    if (!out.moveis.length) out.moveis = [App.marcenaria.novoMovel(uid())];
    if (!out.moveis.some((m) => m.id === out.movelId)) out.movelId = out.moveis[0].id;
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
    // sempre pelo normalize: é ele que preenche os campos novos
    try {
      project = normalize(raw ? JSON.parse(raw) : projetoExemplo());
    } catch (e) {
      project = normalize(projetoExemplo());
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
  const activeMovel = () => project.moveis.find((m) => m.id === project.movelId) || project.moveis[0];
  const findItem = (id) => { const a = activeArea(); return a && a.items.find((i) => i.id === id); };
  const totalArea = () => project.areas.reduce((s, a) => s + a.w * a.h, 0);

  /* Resumo de iluminação de uma área. */
  function luz(a) {
    const lista = a.items.filter((i) => i.type === 'light');
    const efetivo = (i) => i.lumens * ((i.dim == null ? 100 : i.dim) / 100);
    const soma = (k) => lista.filter((i) => i.kind === k).reduce((t, i) => t + efetivo(i), 0);
    const principal = soma('principal'), spot = soma('spot');
    const m2 = a.w * a.h;
    const watts = lista.reduce((t, i) => t + (+i.watts || 0), 0);
    return {
      lista, principal, spot, total: principal + spot, watts,
      m2, alvo: a.lux * m2, lux: m2 ? (principal + spot) / m2 : 0,
    };
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  return {
    uid, load, get, update, begin, live, commit, cancelTx, undo, redo, replace,
    subscribe, activeArea, activeMovel, findItem, totalArea, projetoExemplo, luz,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
})();
