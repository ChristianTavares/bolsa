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

  const lm = (v) => Math.round(v).toLocaleString('pt-BR') + ' lm';

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
    const label = (i) => (i.type === 'furniture' || i.type === 'light') ? i.name
      : i.type === 'line' ? 'Linha'
      : (i.kind === 'porta' ? 'Porta' : 'Janela');
    const size = (i) => i.type === 'furniture'
      ? (i.shape === 'circle' && Math.abs(i.w - i.h) < 1e-6
          ? `Ø ${G.num(i.w)} m` : `${G.num(i.w)}×${G.num(i.h)} m`) + (i.open ? ' · aberto' : '')
      : i.type === 'line' ? G.m(Math.hypot(i.x2 - i.x1, i.y2 - i.y1))
      : i.type === 'light' ? lm(i.lumens)
      : G.m(i.width);
    const color = (i) => i.type === 'furniture' ? (i.color || '#e2e5ec')
      : i.type === 'line' ? '#3b49c4'
      : i.type === 'light' ? '#f0b429' : '#8a91a3';
    ul.innerHTML = `<li class="muted small" style="padding:4px 2px">Itens de ${esc(a.name)} (${a.items.length}) — ✎ muda a medida, 🗑 exclui</li>`
      + a.items.map((i) => `
      <li class="item-row ${i.id === E.selectedId ? 'is-active' : ''}" data-id="${i.id}">
        <span class="dot" style="background:${color(i)}"></span>
        <span class="nm">${esc(label(i))}</span>
        <span class="sz">${size(i)}</span>
        <span class="row-acts">
          <button class="mini" data-act="edit" title="Editar medidas">✎</button>
          <button class="mini danger" data-act="del" title="Excluir">🗑</button>
        </span>
      </li>`).join('');
  }

  function areaDialog(area) {
    const dlg = $('#areaDlg');
    $('#areaDlgTitle').textContent = area ? 'Editar área' : 'Nova área';
    $('#aName').value = area ? area.name : '';
    $('#aW').value = area ? G.num(area.w) : '';
    $('#aH').value = area ? G.num(area.h) : '';
    $('#aT').value = area ? G.num(area.wall * 100, 0) : '10';
    $('#aPd').value = G.num(area ? area.pd : 2.6);
    const tipoSel = $('#aTipo');
    if (!tipoSel.options.length) {
      tipoSel.innerHTML = App.presets.ambientes
        .map((x) => `<option value="${x.nome}">${x.nome} — ${x.lux} lux</option>`).join('');
    }
    tipoSel.value = area ? area.tipo : 'Sala de estar';
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
      const pdv = G.parseNum($('#aPd').value);
      const pd = pdv > 0 ? pdv : 2.6;
      const tipo = $('#aTipo').value;
      const amb = App.presets.ambientes.find((x) => x.nome === tipo);
      const lux = amb ? amb.lux : 150;
      if (area) {
        S.update(() => {
          area.name = name; area.w = w; area.h = h; area.wall = wall; area.color = $('#aColor').value;
          area.pd = pd; area.tipo = tipo; area.lux = lux;
          clampItems(area);
        });
        toast('Área atualizada');
      } else {
        const na = {
          id: S.uid(), name, w, h, wall, pd, tipo, lux, color: $('#aColor').value, items: [],
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
        <i class="${i.forma === 'circle' ? 'round' : ''}" style="background:${i.cor}"></i>
        <b>${esc(i.nome)}${i.alt ? ' <em class="tag">abre</em>' : ''}</b>
        <span>${i.forma === 'circle' ? 'Ø ' + G.num(i.w) + ' m' : G.num(i.w) + ' × ' + G.num(i.h) + ' m'}${
          i.alt ? ' → ' + G.num(i.alt.w) + ' × ' + G.num(i.alt.h) + ' m' : ''}</span>
      </button>`).join('') || '<p class="muted small">Nada nesta categoria.</p>';
  }

  /* ---------- iluminação ---------- */
  function renderLuz() {
    const a = S.activeArea();
    if (!a) return;
    const sel = $('#luxSel');
    if (!sel.options.length) {
      sel.innerHTML = App.presets.ambientes
        .map((x) => `<option value="${x.nome}">${x.nome} — ${x.lux} lux</option>`).join('');
    }
    if (document.activeElement !== sel) sel.value = a.tipo;

    const L = S.luz(a);
    const pct = L.alvo ? Math.min(100, Math.round((L.total / L.alvo) * 100)) : 0;
    const falta = Math.max(0, L.alvo - L.total);
    const spots = Math.ceil(falta / 600);
    const nP = L.lista.filter((i) => i.kind === 'principal').length;
    const nS = L.lista.filter((i) => i.kind === 'spot').length;
    const ok = falta <= 0;

    $('#luzResumo').innerHTML = `
      <div class="luz-card">
        <div class="luz-linha"><span>Área</span><b>${G.m2(L.m2)}</b></div>
        <div class="luz-linha"><span>Alvo (${a.lux} lux)</span><b>${lm(L.alvo)}</b></div>
        <div class="luz-linha"><span>Instalado</span><b>${lm(L.total)}</b></div>
        <div class="luz-bar ${ok ? 'ok' : ''}"><i style="width:${pct}%"></i></div>
        <p class="luz-msg ${ok ? 'ok' : 'falta'}">${ok
          ? `Dá ${Math.round(L.lux)} lux — o ambiente está resolvido.`
          : `Está em ${Math.round(L.lux)} lux. Faltam ${lm(falta)} ≈ ${spots} spot${spots > 1 ? 's' : ''} de 600 lm.`}</p>
        <hr>
        <div class="luz-linha"><span>Principal (${nP})</span><b>${lm(L.principal)}</b></div>
        <div class="luz-linha"><span>Complementar (${nS})</span><b>${lm(L.spot)}</b></div>
        ${L.principal < L.alvo * 0.6 && L.total > 0
          ? '<p class="luz-msg falta">A luz principal sozinha está abaixo de 60% do alvo — com os spots desligados o ambiente fica escuro.</p>'
          : ''}
      </div>`;

    const card = (l, i) => `
      <button class="cat-item" data-luz="${i}">
        <i class="round" style="background:${l.kind === 'principal' ? '#ffd76e' : '#f0b429'}"></i>
        <b>${esc(l.nome)}</b>
        <span>${lm(l.lumens)}</span>
      </button>`;
    const luzes = App.presets.luzes;
    $('#luzCatPrincipal').innerHTML = luzes.map((l, i) => l.kind === 'principal' ? card(l, i) : '').join('');
    $('#luzCatSpot').innerHTML = luzes.map((l, i) => l.kind === 'spot' ? card(l, i) : '').join('');

    $('#luzList').innerHTML = L.lista.length
      ? `<li class="muted small" style="padding:4px 2px">Luminárias nesta área (${L.lista.length})</li>`
        + L.lista.map((i) => `
        <li class="item-row ${i.id === E.selectedId ? 'is-active' : ''}" data-id="${i.id}">
          <span class="dot" style="background:${i.kind === 'principal' ? '#ffd76e' : '#f0b429'}"></span>
          <span class="nm">${esc(i.name)}</span>
          <span class="sz">${lm(i.lumens)}</span>
          <span class="row-acts">
            <button class="mini" data-act="edit" title="Editar">✎</button>
            <button class="mini danger" data-act="del" title="Excluir">🗑</button>
          </span>
        </li>`).join('')
      : '<li class="muted small" style="padding:10px 2px">Nenhuma luminária ainda. Escolha uma acima — ela entra no teto, no centro da tela.</li>';
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
      const redondo = it.shape === 'circle';
      const rot2 = (base) => it.open ? base + ' fechado (m)' : base + ' aberto (m)';
      return `
      <div class="prop-head"><span class="badge">${redondo ? 'Círculo' : 'Móvel'}</span>${
        it.alt ? `<span class="badge">${it.open ? 'aberto' : 'fechado'}</span>` : ''}
        <span class="grow"></span>
        <button class="mini" data-act="dup" title="Duplicar">⧉</button>
        <button class="mini danger" data-act="del" title="Excluir móvel">🗑</button>
      </div>
      <p class="muted small" style="margin:-4px 0 10px">Digite a medida real do seu móvel — o desenho ajusta na hora.</p>
      <div class="row">${fieldNum('pW', 'Largura (m)', G.num(it.w))}${fieldNum('pH', 'Profundidade (m)', G.num(it.h))}</div>
      ${redondo ? '<p class="muted small">Largura igual à profundidade = círculo perfeito; diferentes = oval.</p>' : ''}
      ${it.alt ? `<div class="row">${fieldNum('pAW', rot2('Largura'), G.num(it.alt.w))}${fieldNum('pAH', rot2('Profundidade'), G.num(it.alt.h))}</div>
      <p class="muted small">Móvel de dois tamanhos: toque nele na planta (já selecionado) para abrir e fechar — o encosto fica parado e ele estica para a frente.</p>` : ''}
      <div class="prop-actions">
        ${it.alt ? `<button class="btn btn-primary" data-act="toggle">${it.open ? 'Fechar' : 'Abrir'}</button>`
                 : '<button class="btn" data-act="addalt">Definir tamanho aberto</button>'}
        ${redondo ? '<button class="btn" data-act="equal">Igualar medidas</button>'
                  : '<button class="btn" data-act="rot90">Girar 90°</button>'}
      </div>
      <hr>
      <div class="field"><label for="pName">Nome</label><input id="pName" value="${esc(it.name || '')}"></div>
      <div class="field"><label for="pShape">Formato</label>
        <select id="pShape">
          <option value="rect" ${redondo ? '' : 'selected'}>Retângulo</option>
          <option value="circle" ${redondo ? 'selected' : ''}>Círculo / oval</option>
        </select></div>
      <div class="row">${fieldNum('pAlt', 'Altura (m)', G.num(it.altura))}${fieldNum('pBase', 'Base do chão (m)', G.num(it.base))}</div>
      <p class="muted small">Altura e base aparecem na <b>vista frontal</b> — base &gt; 0 para o que fica na parede (armário aéreo, TV, ar-condicionado).</p>
      <div class="row">${fieldNum('pX', 'X do centro (m)', G.num(it.x))}${fieldNum('pY', 'Y do centro (m)', G.num(it.y))}</div>
      <div class="row">${fieldNum('pR', 'Rotação (°)', G.num(it.rot || 0, 0))}
        <div class="field"><label for="pColor">Cor</label><input id="pColor" type="color" value="${toHex(it.color)}"></div></div>
      <button class="btn btn-danger block" data-act="del">Excluir móvel</button>`;
    }
    if (it.type === 'light') {
      const principal = it.kind === 'principal';
      return `
      <div class="prop-head"><span class="badge">${principal ? 'Luz principal' : 'Complementar'}</span>
        <span class="grow"></span>
        <button class="mini" data-act="dup" title="Duplicar">⧉</button>
        <button class="mini danger" data-act="del" title="Excluir luminária">🗑</button>
      </div>
      <div class="field"><label for="pName">Nome</label><input id="pName" value="${esc(it.name || '')}"></div>
      <div class="field"><label>Tipo</label>
        <div class="seg">
          <button type="button" data-act="luzkind" data-val="principal" class="${principal ? 'is-on' : ''}">Principal</button>
          <button type="button" data-act="luzkind" data-val="spot" class="${principal ? '' : 'is-on'}">Complementar</button>
        </div>
      </div>
      <div class="row">${fieldNum('pLm', 'Lúmens (lm)', Math.round(it.lumens))}${fieldNum('pX', 'X (m)', G.num(it.x))}</div>
      <div class="row">${fieldNum('pY', 'Y (m)', G.num(it.y))}<div class="field"></div></div>
      <p class="muted small">O halo na planta mostra o alcance em que essa luminária sozinha entrega ${S.activeArea().lux} lux.</p>
      <button class="btn btn-danger block" data-act="del">Excluir luminária</button>`;
    }
    if (it.type === 'line') {
      const len = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
      const ang = G.r2d(Math.atan2(it.y2 - it.y1, it.x2 - it.x1));
      return `
      <div class="prop-head"><span class="badge">Linha</span>
        <span class="grow"></span>
        <button class="mini" data-act="dup" title="Duplicar">⧉</button>
        <button class="mini danger" data-act="del" title="Excluir linha">🗑</button>
      </div>
      <div class="row">${fieldNum('pLen', 'Comprimento (m)', G.num(len))}${fieldNum('pAng', 'Ângulo (°)', G.num(ang, 0))}</div>
      <p class="muted small">A linha está na mesma escala do cômodo — use para dividir ambientes ou medir vãos antes de comprar o móvel.</p>
      <button class="btn btn-danger block" data-act="del">Excluir linha</button>`;
    }
    const paredes = { top: 'Superior', right: 'Direita', bottom: 'Inferior', left: 'Esquerda' };
    const nomeAbertura = it.kind === 'porta' ? 'porta' : 'janela';
    const horiz = it.wall === 'top' || it.wall === 'bottom';
    const ladoA = horiz ? 'Esquerda' : 'Em cima';
    const ladoB = horiz ? 'Direita' : 'Embaixo';
    const sentido = it.kind !== 'porta' ? '' : `
      <div class="field">
        <label>Dobradiça</label>
        <div class="seg">
          <button type="button" data-act="hinge" data-val="a" class="${it.flip ? '' : 'is-on'}">${ladoA}</button>
          <button type="button" data-act="hinge" data-val="b" class="${it.flip ? 'is-on' : ''}">${ladoB}</button>
        </div>
      </div>
      <div class="field">
        <label>Abre para</label>
        <div class="seg">
          <button type="button" data-act="swing" data-val="in" class="${it.out ? '' : 'is-on'}">Dentro</button>
          <button type="button" data-act="swing" data-val="out" class="${it.out ? 'is-on' : ''}">Fora</button>
        </div>
      </div>
      <p class="muted small">Tocar na porta já selecionada também vira o sentido (passa pelas 4 posições).</p>`;
    return `
      <div class="prop-head"><span class="badge">${it.kind === 'porta' ? 'Porta' : 'Janela'}</span>
        <span class="grow"></span>
        <button class="mini" data-act="dup" title="Duplicar">⧉</button>
        <button class="mini danger" data-act="del" title="Excluir ${nomeAbertura}">🗑</button>
      </div>
      <div class="row">${fieldNum('pOw', 'Largura (m)', G.num(it.width))}${fieldNum('pOp', 'Distância do canto (m)', G.num(it.pos))}</div>
      <div class="row">${fieldNum('pOh', 'Altura do vão (m)', G.num(it.altura))}${fieldNum('pOb', it.kind === 'porta' ? 'Base do chão (m)' : 'Peitoril (m)', G.num(it.base))}</div>
      <div class="field"><label for="pWall">Parede</label>
        <select id="pWall">${Object.entries(paredes).map(([k, v]) =>
          `<option value="${k}" ${it.wall === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      ${sentido}
      <button class="btn btn-danger block" data-act="del">Excluir ${nomeAbertura}</button>`;
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
    const key = it.id + ':' + it.type + ':' + (it.kind || '') + ':' + (it.shape || '')
      + ':' + (it.alt ? 'alt' : '') + ':' + (it.open ? 'aberto' : '')
      + ':' + (it.wall || '') + (it.flip ? 'f' : '') + (it.out ? 'o' : '')
      + ':' + (it.type === 'light' ? it.kind : '');
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
      setVal('pAlt', G.num(it.altura)); setVal('pBase', G.num(it.base));
      if (it.alt) { setVal('pAW', G.num(it.alt.w)); setVal('pAH', G.num(it.alt.h)); }
    } else if (it.type === 'light') {
      setVal('pName', it.name || '');
      setVal('pLm', Math.round(it.lumens));
      setVal('pX', G.num(it.x)); setVal('pY', G.num(it.y));
    } else if (it.type === 'line') {
      setVal('pLen', G.num(Math.hypot(it.x2 - it.x1, it.y2 - it.y1)));
      setVal('pAng', G.num(G.r2d(Math.atan2(it.y2 - it.y1, it.x2 - it.x1)), 0));
    } else {
      setVal('pOw', G.num(it.width));
      setVal('pOp', G.num(it.pos));
      setVal('pOh', G.num(it.altura));
      setVal('pOb', G.num(it.base));
      const w = document.getElementById('pWall');
      if (w && document.activeElement !== w) w.value = it.wall;
    }
  }

  function wireProps(it) {
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
      const shp = document.getElementById('pShape');
      shp.addEventListener('change', () => S.update(() => {
        it.shape = shp.value === 'circle' ? 'circle' : 'rect';
        fix();
      }));
      onNum('pW', (v) => { it.w = G.clamp(v, 0.05, 50); fix(); });
      onNum('pH', (v) => { it.h = G.clamp(v, 0.05, 50); fix(); });
      onNum('pX', (v) => { it.x = v; fix(); });
      onNum('pY', (v) => { it.y = v; fix(); });
      onNum('pR', (v) => { it.rot = ((v % 360) + 360) % 360; fix(); });
      onNum('pAlt', (v) => { it.altura = G.clamp(v, 0.01, 6); });
      onNum('pBase', (v) => { it.base = G.clamp(v, 0, 6); });
      if (it.alt) {
        onNum('pAW', (v) => { it.alt.w = G.clamp(v, 0.05, 50); });
        onNum('pAH', (v) => { it.alt.h = G.clamp(v, 0.05, 50); });
      }
    } else if (it.type === 'light') {
      const nm = document.getElementById('pName');
      nm.addEventListener('change', () => S.update(() => { it.name = nm.value.trim() || 'Luminária'; }));
      onNum('pLm', (v) => { it.lumens = G.clamp(Math.round(v), 10, 20000); });
      onNum('pX', (v) => { it.x = G.clamp(v, 0, a.w); });
      onNum('pY', (v) => { it.y = G.clamp(v, 0, a.h); });
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
      onNum('pOh', (v) => { it.altura = G.clamp(v, 0.2, a.pd); });
      onNum('pOb', (v) => { it.base = G.clamp(v, 0, Math.max(0, a.pd - it.altura)); });
    }

  }

  /* Registrado uma única vez: o formulário é reconstruído, o elemento não. */
  function bindPropsActions() {
    $('#propsForm').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b) return;
      const it = E.getSelected();
      if (!it) return;
      const act = b.dataset.act;
      if (act === 'del') E.removeSelected();
      if (act === 'dup') E.duplicateSelected();
      if (act === 'rot90') S.update(() => {
        it.rot = (((it.rot || 0) + 90) % 360);
        E.keepInside(it, S.activeArea());
      });
      if (act === 'hinge') S.update(() => { it.flip = b.dataset.val === 'b'; });
      if (act === 'swing') S.update(() => { it.out = b.dataset.val === 'out'; });
      if (act === 'luzkind') S.update(() => { it.kind = b.dataset.val === 'principal' ? 'principal' : 'spot'; });
      if (act === 'equal') S.update(() => { it.h = it.w; it.rot = 0; E.keepInside(it, S.activeArea()); });
      if (act === 'toggle') E.toggleOpen(it.id);
      if (act === 'addalt') {
        S.update(() => {
          it.alt = { w: it.w, h: Math.round((it.h + 1) * 100) / 100 };
          it.open = false;
        });
        toast('Ajuste o tamanho aberto e toque no móvel para abrir');
      }
      E.draw();
    });
  }

  /* ---------- formas com medida informada ---------- */
  const rotulos = {
    rect:   { titulo: 'Móvel com medida própria', medida: 'Largura (m)', nome: 'Ex.: Guarda-roupa',
              ph: '1,50', ajuda: 'Medidas internas do móvel, em metros — pode usar vírgula.' },
    square: { titulo: 'Quadrado com a sua medida', medida: 'Lado (m)', nome: 'Ex.: Puff',
              ph: '0,60', ajuda: 'O lado vale para os dois sentidos.' },
    circle: { titulo: 'Círculo com a sua medida', medida: 'Diâmetro (m)', nome: 'Ex.: Mesa redonda',
              ph: '1,00', ajuda: 'O círculo entra na mesma escala do cômodo.' },
  };

  function applyShapeFields() {
    const v = $('#iShape').value;
    const r = rotulos[v] || rotulos.rect;
    $('#itemDlgTitle').textContent = r.titulo;
    $('#iWLabel').textContent = r.medida;
    $('#iW').placeholder = r.ph;
    $('#iName').placeholder = r.nome;
    $('#iHelp').textContent = r.ajuda;
    $('#iHField').hidden = v !== 'rect';
  }

  function shapeDialog(shape) {
    const dlg = $('#itemDlg');
    $('#iShape').value = shape || 'rect';
    $('#iName').value = ''; $('#iW').value = ''; $('#iH').value = ''; $('#iAlt').value = '';
    applyShapeFields();
    dlg.returnValue = '';
    dlg.showModal();
    dlg.addEventListener('close', () => {
      if (dlg.returnValue !== 'ok') return;
      const v = $('#iShape').value;
      const w = G.parseNum($('#iW').value);
      const h = v === 'rect' ? G.parseNum($('#iH').value) : w;
      if (!(w > 0) || !(h > 0)) { toast('Informe a medida em metros'); return; }
      const padrao = v === 'circle' ? 'Círculo' : v === 'square' ? 'Quadrado' : 'Móvel';
      const alt = G.parseNum($('#iAlt').value);
      E.addFurniture({
        nome: $('#iName').value.trim() || padrao,
        w, h,
        altura: alt > 0 ? alt : 0.75,
        forma: v === 'circle' ? 'circle' : 'rect',
        cor: '#e2e5ec',
      });
      if (isMobile()) openPanel(false);
      setTab('props');
    }, { once: true });
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
      renderLuz();
      renderProps();
      renderView();
      $('#btnUndo').disabled = !S.canUndo();
      $('#btnRedo').disabled = !S.canRedo();
    });
  }

  function renderView() {
    const m = E.mode;
    $$('#viewSwitch button').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === m));
    $('#wallNav').hidden = m !== 'front';
    $('#toolbar').hidden = m === 'front';
    if (m === 'front') $('#wallName').textContent = 'Parede ' + App.elev.NOMES[E.frontWall];
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
      const act = ev.target.closest('[data-act]');
      if (act && act.dataset.act === 'del') {
        const nome = row.querySelector('.nm').textContent;
        E.removeSelected();
        toast(nome + ' excluído — desfaça no ↶ lá em cima');
        return;
      }
      setTab('props');
      if (isMobile()) openPanel(true);
    });

    $('#btnNewArea').addEventListener('click', () => areaDialog(null));

    const addLuz = (ev) => {
      const b = ev.target.closest('[data-luz]');
      if (!b) return;
      E.addLight(App.presets.luzes[+b.dataset.luz]);
      if (isMobile()) openPanel(false);
    };
    $('#luzCatPrincipal').addEventListener('click', addLuz);
    $('#luzCatSpot').addEventListener('click', addLuz);

    $('#luzList').addEventListener('click', (ev) => {
      const row = ev.target.closest('.item-row');
      if (!row) return;
      E.select(row.dataset.id);
      const act = ev.target.closest('[data-act]');
      if (act && act.dataset.act === 'del') {
        E.removeSelected();
        toast('Luminária excluída — desfaça no ↶ lá em cima');
        return;
      }
      setTab('props');
    });

    $('#luxSel').addEventListener('change', () => {
      const amb = App.presets.ambientes.find((x) => x.nome === $('#luxSel').value);
      if (!amb) return;
      S.update(() => {
        const a = S.activeArea();
        a.tipo = amb.nome; a.lux = amb.lux;
      });
      E.draw();
    });

    $('#viewSwitch').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-mode]');
      if (!b) return;
      E.setMode(b.dataset.mode);
      if (b.dataset.mode === 'front') hint('Arraste um móvel: para os lados anda na parede, para cima muda a altura do chão');
    });
    $('#wallPrev').addEventListener('click', () => E.girarParede(-1));
    $('#wallNext').addEventListener('click', () => E.girarParede(1));

    $('#catFilter').addEventListener('change', renderCatalog);
    $('#catalog').addEventListener('click', (ev) => {
      const b = ev.target.closest('.cat-item');
      if (!b) return;
      E.addFurniture(App.presets.itens[+b.dataset.idx]);
      if (isMobile()) openPanel(false);
      setTab('props');
    });

    $('#shapeAdd').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-shape]');
      if (b) shapeDialog(b.dataset.shape);
    });
    $('#iShape').addEventListener('change', applyShapeFields);

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
    bindPropsActions();
    adaptMenu();
    renderCatalog();
    render();
    S.subscribe(render);
  }

  const activeTab = () => {
    const t = document.querySelector('.tab.is-active');
    return t ? t.dataset.tab : 'areas';
  };

  return { init, render, toast, hint, setTab, isMobile, openPanel, activeTab };
})();
