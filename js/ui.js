/* Painéis, formulários, catálogo e menus. */
window.App = window.App || {};

App.UI = (function () {
  const G = App.geo, S = App.Store, E = App.Editor;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let lastPropsKey = '';
  let lastAreasSig = '';
  let hintTimer = 0;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function hint(msg) {
    const el = $('#hint');
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function confirmDlg(title, text) {
    return new Promise((resolve) => {
      const dlg = $('#confirmDlg');
      $('#confirmTitle').textContent = title;
      $('#confirmText').textContent = text;
      dlg.returnValue = '';
      dlg.showModal();
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    });
  }

  function setTab(name) {
    $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    $$('.pane').forEach((p) => p.classList.toggle('is-active', p.id === 'pane-' + name));
  }
  const isMobile = () => window.matchMedia('(max-width:820px)').matches;
  function openPanel(open) {
    $('#panel').classList.toggle('is-open', open);
  }

  /* ---------- áreas ---------- */
  function renderAreas() {
    const p = S.get();
    const sig = JSON.stringify(p.areas.map((a) => [a.id, a.name, a.w, a.h, a.items.length]))
      + '|' + p.activeId;
    if (sig === lastAreasSig) return;
    lastAreasSig = sig;

    const ul = $('#areaList');
    ul.innerHTML = p.areas.map((a) => `
      <li class="area-item ${a.id === p.activeId ? 'is-active' : ''}" data-id="${a.id}">
        <span class="area-swatch" style="background:${esc(a.color)}"></span>
        <span class="area-info">
          <b>${esc(a.name)}</b>
          <span>${G.num(a.w)} × ${G.num(a.h)} m · ${G.m2(a.w * a.h)}</span>
        </span>
        <span class="area-acts">
          <button class="mini" data-act="edit" title="Editar medidas">✎</button>
          <button class="mini" data-act="del" title="Excluir área">🗑</button>
        </span>
      </li>`).join('');

    $('#projTotal').textContent = 'Total: ' + G.m2(S.totalArea());
    $('#projName').textContent = p.name;
    const a = S.activeArea();
    $('#areaChip').textContent = a
      ? `${a.name} · ${G.num(a.w)} × ${G.num(a.h)} m · ${G.m2(a.w * a.h)}`
      : '—';
  }

  function renderItems() {
    const a = S.activeArea();
    let ul = $('#itemList');
    if (!ul) {
      ul = document.createElement('ul');
      ul.id = 'itemList';
      ul.className = 'item-list';
      $('#pane-areas').appendChild(ul);
    }
    if (!a) { ul.innerHTML = ''; return; }
    const label = (i) => i.type === 'furniture' ? i.name
      : i.type === 'line' ? 'Linha'
      : (i.kind === 'porta' ? 'Porta' : 'Janela');
    const size = (i) => i.type === 'furniture' ? `${G.num(i.w)}×${G.num(i.h)} m`
      : i.type === 'line' ? G.m(Math.hypot(i.x2 - i.x1, i.y2 - i.y1))
      : G.m(i.width);
    const color = (i) => i.type === 'furniture' ? (i.color || '#e2e5ec')
      : i.type === 'line' ? '#3b49c4' : '#8a91a3';
    ul.innerHTML = `<li class="muted small" style="padding:4px 2px">Itens de ${esc(a.name)} (${a.items.length})</li>`
      + a.items.map((i) => `
      <li class="item-row ${i.id === E.selectedId ? 'is-active' : ''}" data-id="${i.id}">
        <span class="dot" style="background:${color(i)}"></span>
        <span class="nm">${esc(label(i))}</span>
        <span class="sz">${size(i)}</span>
      </li>`).join('');
  }

  function areaDialog(area) {
    const dlg = $('#areaDlg');
    $('#areaDlgTitle').textContent = area ? 'Editar área' : 'Nova área';
    $('#aName').value = area ? area.name : '';
    $('#aW').value = area ? G.num(area.w) : '';
    $('#aH').value = area ? G.num(area.h) : '';
    $('#aT').value = area ? G.num(area.wall * 100, 0) : '10';
    $('#aColor').value = area ? area.color : randomColor();
    $('#areaErr').hidden = true;
    dlg.returnValue = '';
    dlg.showModal();

    dlg.addEventListener('close', () => {
      if (dlg.returnValue !== 'ok') return;
      const w = G.parseNum($('#aW').value);
      const h = G.parseNum($('#aH').value);
      const t = G.parseNum($('#aT').value) / 100;
      const name = $('#aName').value.trim() || 'Área';
      if (!(w > 0) || !(h > 0)) { toast('Informe largura e profundidade em metros'); return; }
      const wall = Number.isFinite(t) && t >= 0 ? t : 0.1;
      if (area) {
        S.update(() => {
          area.name = name; area.w = w; area.h = h; area.wall = wall; area.color = $('#aColor').value;
          clampItems(area);
        });
        toast('Área atualizada');
      } else {
        const na = {
          id: S.uid(), name, w, h, wall, color: $('#aColor').value, items: [],
        };
        S.update((p) => { p.areas.push(na); p.activeId = na.id; });
        E.select(null);
        toast('Área criada');
      }
      E.fit();
    }, { once: true });
  }

  function clampItems(a) {
    a.items.forEach((i) => {
      if (i.type === 'opening') {
        const run = (i.wall === 'top' || i.wall === 'bottom') ? a.w : a.h;
        i.width = G.clamp(i.width, 0.2, run);
        i.pos = G.clamp(i.pos, 0, run - i.width);
      } else if (i.type === 'furniture') {
        E.keepInside(i, a);
      }
    });
  }

  function randomColor() {
    const cores = ['#7c8cff', '#4bb3a5', '#e9915c', '#c76b98', '#5aa9e6', '#8bbf5a'];
    return cores[Math.floor(Math.random() * cores.length)];
  }

  /* ---------- catálogo ---------- */
  function renderCatalog() {
    const sel = $('#catFilter');
    if (!sel.options.length) {
      sel.innerHTML = App.presets.categorias.map((c) => `<option>${c}</option>`).join('');
    }
    const cat = sel.value || 'Todos';
    const itens = App.presets.itens.filter((i) => cat === 'Todos' || i.cat === cat);
    $('#catalog').innerHTML = itens.map((i) => `
      <button class="cat-item" data-idx="${App.presets.itens.indexOf(i)}">
        <i style="background:${i.cor}"></i>
        <b>${esc(i.nome)}</b>
        <span>${G.num(i.w)} × ${G.num(i.h)} m</span>
      </button>`).join('') || '<p class="muted small">Nada nesta categoria.</p>';
  }

  /* ---------- propriedades ---------- */
  function fieldNum(id, label, value, step) {
    return `<div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" inputmode="decimal" value="${value}" data-step="${step || ''}">
    </div>`;
  }

  function propsHTML(it) {
    if (it.type === 'furniture') {
      return `
      <div class="prop-head"><span class="badge">Móvel</span></div>
      <div class="field"><label for="pName">Nome</label><input id="pName" value="${esc(it.name || '')}"></div>
      <div class="row">${fieldNum('pW', 'Largura (m)', G.num(it.w))}${fieldNum('pH', 'Profundidade (m)', G.num(it.h))}</div>
      <div class="row">${fieldNum('pX', 'X do centro (m)', G.num(it.x))}${fieldNum('pY', 'Y do centro (m)', G.num(it.y))}</div>
      <div class="row">${fieldNum('pR', 'Rotação (°)', G.num(it.rot || 0, 0))}
        <div class="field"><label for="pColor">Cor</label><input id="pColor" type="color" value="${toHex(it.color)}"></div></div>
      <div class="prop-actions">
        <button class="btn" data-act="rot90">Girar 90°</button>
        <button class="btn" data-act="dup">Duplicar</button>
        <button class="btn btn-danger" data-act="del">Excluir</button>
      </div>`;
    }
    if (it.type === 'line') {
      const len = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
      const ang = G.r2d(Math.atan2(it.y2 - it.y1, it.x2 - it.x1));
      return `
      <div class="prop-head"><span class="badge">Linha</span></div>
      <div class="row">${fieldNum('pLen', 'Comprimento (m)', G.num(len))}${fieldNum('pAng', 'Ângulo (°)', G.num(ang, 0))}</div>
      <p class="muted small">A linha está na mesma escala do cômodo — use para dividir ambientes ou medir vãos antes de comprar o móvel.</p>
      <div class="prop-actions">
        <button class="btn" data-act="dup">Duplicar</button>
        <button class="btn btn-danger" data-act="del">Excluir</button>
      </div>`;
    }
    const paredes = { top: 'Superior', right: 'Direita', bottom: 'Inferior', left: 'Esquerda' };
    return `
      <div class="prop-head"><span class="badge">${it.kind === 'porta' ? 'Porta' : 'Janela'}</span></div>
      <div class="field"><label for="pWall">Parede</label>
        <select id="pWall">${Object.entries(paredes).map(([k, v]) =>
          `<option value="${k}" ${it.wall === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="row">${fieldNum('pOw', 'Largura (m)', G.num(it.width))}${fieldNum('pOp', 'Distância do canto (m)', G.num(it.pos))}</div>
      <div class="prop-actions">
        ${it.kind === 'porta' ? '<button class="btn" data-act="flip">Inverter abertura</button>' : ''}
        <button class="btn" data-act="dup">Duplicar</button>
        <button class="btn btn-danger" data-act="del">Excluir</button>
      </div>`;
  }

  function toHex(c) {
    if (!c) return '#e2e5ec';
    if (c[0] === '#' && c.length === 7) return c;
    return '#e2e5ec';
  }

  function renderProps() {
    const it = E.getSelected();
    const box = $('#propsForm'), empty = $('#propsEmpty');
    if (!it) {
      lastPropsKey = '';
      box.hidden = true; box.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true; box.hidden = false;
    const key = it.id + ':' + it.type + ':' + (it.kind || '');
    if (key !== lastPropsKey) {
      lastPropsKey = key;
      box.innerHTML = propsHTML(it);
      wireProps(it);
    } else {
      syncProps(it);
    }
  }

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = v;
  }

  function syncProps(it) {
    if (it.type === 'furniture') {
      setVal('pName', it.name || '');
      setVal('pW', G.num(it.w)); setVal('pH', G.num(it.h));
      setVal('pX', G.num(it.x)); setVal('pY', G.num(it.y));
      setVal('pR', G.num(it.rot || 0, 0));
    } else if (it.type === 'line') {
      setVal('pLen', G.num(Math.hypot(it.x2 - it.x1, it.y2 - it.y1)));
      setVal('pAng', G.num(G.r2d(Math.atan2(it.y2 - it.y1, it.x2 - it.x1)), 0));
    } else {
      setVal('pOw', G.num(it.width));
      setVal('pOp', G.num(it.pos));
      const w = document.getElementById('pWall');
      if (w && document.activeElement !== w) w.value = it.wall;
    }
  }

  function wireProps(it) {
    const box = $('#propsForm');
    const a = S.activeArea();

    const onNum = (id, apply) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const v = G.parseNum(el.value);
        if (!Number.isFinite(v)) { renderProps(); return; }
        S.update(() => apply(v));
        E.draw();
        renderProps();
      });
    };

    if (it.type === 'furniture') {
      const nm = document.getElementById('pName');
      nm.addEventListener('change', () => S.update(() => { it.name = nm.value.trim() || 'Móvel'; }));
      const col = document.getElementById('pColor');
      col.addEventListener('input', () => S.update(() => { it.color = col.value; }));
      const fix = () => E.keepInside(it, S.activeArea());
      onNum('pW', (v) => { it.w = G.clamp(v, 0.05, 50); fix(); });
      onNum('pH', (v) => { it.h = G.clamp(v, 0.05, 50); fix(); });
      onNum('pX', (v) => { it.x = v; fix(); });
      onNum('pY', (v) => { it.y = v; fix(); });
      onNum('pR', (v) => { it.rot = ((v % 360) + 360) % 360; fix(); });
    } else if (it.type === 'line') {
      onNum('pLen', (v) => {
        const ang = Math.atan2(it.y2 - it.y1, it.x2 - it.x1);
        it.x2 = it.x1 + Math.cos(ang) * v;
        it.y2 = it.y1 + Math.sin(ang) * v;
      });
      onNum('pAng', (v) => {
        const len = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
        it.x2 = it.x1 + Math.cos(G.d2r(v)) * len;
        it.y2 = it.y1 + Math.sin(G.d2r(v)) * len;
      });
    } else {
      const ws = document.getElementById('pWall');
      ws.addEventListener('change', () => S.update(() => {
        it.wall = ws.value;
        const run = (it.wall === 'top' || it.wall === 'bottom') ? a.w : a.h;
        it.width = G.clamp(it.width, 0.2, run);
        it.pos = G.clamp(it.pos, 0, run - it.width);
      }));
      onNum('pOw', (v) => {
        const run = (it.wall === 'top' || it.wall === 'bottom') ? a.w : a.h;
        it.width = G.clamp(v, 0.2, run);
        it.pos = G.clamp(it.pos, 0, run - it.width);
      });
      onNum('pOp', (v) => {
        const run = (it.wall === 'top' || it.wall === 'bottom') ? a.w : a.h;
        it.pos = G.clamp(v, 0, Math.max(0, run - it.width));
      });
    }

    box.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'del') E.removeSelected();
      if (act === 'dup') E.duplicateSelected();
      if (act === 'rot90') S.update(() => {
        it.rot = (((it.rot || 0) + 90) % 360);
        E.keepInside(it, S.activeArea());
      });
      if (act === 'flip') S.update(() => { it.flip = !it.flip; });
      E.draw();
    });
  }

  /* ---------- render geral ---------- */
  let scheduled = false;
  function render() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      renderAreas();
      renderItems();
      renderProps();
      $('#btnUndo').disabled = !S.canUndo();
      $('#btnRedo').disabled = !S.canRedo();
    });
  }

  /* ---------- import / export ---------- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(S.get(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (S.get().name || 'planta').replace(/\s+/g, '-').toLowerCase() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Projeto exportado');
  }

  function importJSON(file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        S.replace(JSON.parse(rd.result));
        E.select(null); E.fit();
        toast('Projeto importado');
      } catch (e) {
        toast('Arquivo inválido');
      }
    };
    rd.readAsText(file);
  }

  /* ---------- eventos ---------- */
  function bind() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => {
      setTab(t.dataset.tab);
      if (isMobile()) openPanel(true);
    }));

    $('#btnPanel').addEventListener('click', () => openPanel(!$('#panel').classList.contains('is-open')));
    $('#sheetGrip').addEventListener('click', () => openPanel(false));

    $('#areaList').addEventListener('click', async (ev) => {
      const li = ev.target.closest('.area-item');
      if (!li) return;
      const id = li.dataset.id;
      const a = S.get().areas.find((x) => x.id === id);
      const act = ev.target.closest('[data-act]');
      if (act && act.dataset.act === 'edit') { areaDialog(a); return; }
      if (act && act.dataset.act === 'del') {
        if (S.get().areas.length === 1) { toast('Mantenha ao menos uma área'); return; }
        if (await confirmDlg('Excluir área', `Excluir "${a.name}" e todos os seus itens?`)) {
          S.update((p) => {
            p.areas = p.areas.filter((x) => x.id !== id);
            if (p.activeId === id) p.activeId = p.areas[0].id;
          });
          E.select(null); E.fit();
        }
        return;
      }
      S.update((p) => { p.activeId = id; });
      E.select(null); E.fit();
      if (isMobile()) openPanel(false);
    });

    $('#pane-areas').addEventListener('click', (ev) => {
      const row = ev.target.closest('.item-row');
      if (!row) return;
      E.select(row.dataset.id);
      setTab('props');
    });

    $('#btnNewArea').addEventListener('click', () => areaDialog(null));

    $('#catFilter').addEventListener('change', renderCatalog);
    $('#catalog').addEventListener('click', (ev) => {
      const b = ev.target.closest('.cat-item');
      if (!b) return;
      E.addFurniture(App.presets.itens[+b.dataset.idx]);
      if (isMobile()) openPanel(false);
      setTab('props');
    });

    $('#btnCustomItem').addEventListener('click', () => {
      const dlg = $('#itemDlg');
      $('#iName').value = ''; $('#iW').value = ''; $('#iH').value = '';
      dlg.returnValue = '';
      dlg.showModal();
      dlg.addEventListener('close', () => {
        if (dlg.returnValue !== 'ok') return;
        const w = G.parseNum($('#iW').value), h = G.parseNum($('#iH').value);
        if (!(w > 0) || !(h > 0)) { toast('Medidas inválidas'); return; }
        E.addFurniture({ nome: $('#iName').value.trim() || 'Móvel', w, h, cor: '#e2e5ec' });
        if (isMobile()) openPanel(false);
        setTab('props');
      }, { once: true });
    });

    $$('.tool').forEach((b) => b.addEventListener('click', () => {
      E.setTool(b.dataset.tool);
      if (isMobile()) openPanel(false);
    }));

    $('#btnZoomIn').addEventListener('click', E.zoomIn);
    $('#btnZoomOut').addEventListener('click', E.zoomOut);
    $('#btnFit').addEventListener('click', () => E.fit());
    $('#btnUndo').addEventListener('click', () => S.undo());
    $('#btnRedo').addEventListener('click', () => S.redo());

    $('#btnRename').addEventListener('click', () => {
      const nome = prompt('Nome do projeto', S.get().name);
      if (nome != null && nome.trim()) S.update((p) => { p.name = nome.trim(); });
    });

    const menu = $('#moreMenu');
    $('#btnMore').addEventListener('click', (ev) => {
      ev.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', () => { menu.hidden = true; });
    menu.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      menu.hidden = true;
      const act = b.dataset.act;
      if (act === 'png') { E.exportPNG(); toast('Imagem gerada'); }
      if (act === 'export') exportJSON();
      if (act === 'import') $('#fileInput').click();
      if (act === 'reset') {
        if (await confirmDlg('Começar do zero', 'Isso apaga todas as áreas e móveis deste navegador.')) {
          S.replace(S.projetoExemplo());
          E.select(null); E.fit();
        }
      }
    });

    $('#fileInput').addEventListener('change', (ev) => {
      if (ev.target.files[0]) importJSON(ev.target.files[0]);
      ev.target.value = '';
    });
  }

  /* Dentro de um preview/iframe o navegador bloqueia downloads. */
  const embedded = (() => {
    try { return window.top !== window.self; } catch (e) { return true; }
  })();

  function adaptMenu() {
    if (!embedded) return;
    ['png', 'export', 'import'].forEach((act) => {
      const b = document.querySelector('#moreMenu [data-act="' + act + '"]');
      if (b) b.hidden = true;
    });
    const note = document.createElement('p');
    note.className = 'muted small';
    note.style.padding = '8px 12px';
    note.style.margin = '0';
    note.textContent = 'Salvar PNG e exportar .json só funcionam com o site aberto em aba própria.';
    $('#moreMenu').insertBefore(note, $('#moreMenu').firstChild);
  }

  function init() {
    bind();
    adaptMenu();
    renderCatalog();
    render();
    S.subscribe(render);
  }

  return { init, render, toast, hint, setTab, isMobile, openPanel };
})();
