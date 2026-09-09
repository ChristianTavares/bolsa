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

  let secao = 'amb';   // 'amb' = ambientes | 'mob' = marcenaria

  const GRUPO = {
    areas: 'amb', add: 'amb', luz: 'amb', props: 'amb',
    moveis: 'mob', modulos: 'mob', corte: 'mob',
  };

  function setTab(name) {
    if (GRUPO[name] && GRUPO[name] !== secao) return;   // aba de outra seção
    $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    $$('.pane').forEach((p) => p.classList.toggle('is-active', p.id === 'pane-' + name));
  }

  function setSecao(sec) {
    secao = sec === 'mob' ? 'mob' : 'amb';
    $('#tabsAmb').hidden = secao !== 'amb';
    $('#tabsMob').hidden = secao !== 'mob';
    $$('#secSwitch button').forEach((b) => b.classList.toggle('is-on', b.dataset.sec === secao));
    if (secao === 'mob') { E.setMode('mob'); setTab('moveis'); }
    else { E.setMode('plan'); setTab('areas'); }
    render();
  }
  const isMobile = () => window.matchMedia('(max-width:820px)').matches;
  function openPanel(open) {
    $('#panel').classList.toggle('is-open', open);
  }

  /* ---------- áreas ---------- */
  function renderModelosArea() {
    const box = $('#areaModelos');
    if (!box || box.dataset.pronto) return;
    box.dataset.pronto = '1';
    box.innerHTML = App.presets.areas.map((m, i) => `
      <button class="cat-item" data-area="${i}">
        <i style="background:#4bb3a5"></i>
        <b>${esc(m.nome)}</b>
        <span>${esc(m.desc)}</span>
      </button>`).join('');
  }

  function renderAreas() {
    renderModelosArea();
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
          id: S.uid(), name, w, h, wall, pd, tipo, lux, refl: 'claras',
          color: $('#aColor').value, items: [],
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
  /* Iluminância vertical média de cada parede, em lux. */
  function paredes(a) {
    const luzes = a.items.filter((i) => i.type === 'light');
    if (!luzes.length) return '—';
    return ['top', 'right', 'bottom', 'left']
      .map((w) => Math.round(App.lightmap.parede(a, w, luzes).media))
      .join(' · ') + ' lux';
  }

  function renderLuz() {
    const a = S.activeArea();
    if (!a) return;
    const bt = $('#btnMapa');
    if (bt) bt.textContent = E.mapaLuz ? 'Ocultar mapa de luz' : 'Mostrar mapa de luz';
    const rs = $('#reflSel');
    if (rs && document.activeElement !== rs) rs.value = a.refl;
    const sel = $('#luxSel');
    if (!sel.options.length) {
      sel.innerHTML = App.presets.ambientes
        .map((x) => `<option value="${x.nome}">${x.nome} — ${x.lux} lux</option>`).join('');
    }
    if (document.activeElement !== sel) sel.value = a.tipo;

    const L = S.luz(a);
    const mapa = App.lightmap.calc(a);
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
          ? `Dá ${Math.round(mapa.media)} lux médios no plano — o ambiente está resolvido.`
          : `Está em ${Math.round(mapa.media)} lux médios. Faltam ${lm(falta)} ≈ ${spots} spot${spots > 1 ? 's' : ''} de 600 lm.`}</p>
        <hr>
        <div class="luz-linha"><span>Principal (${nP})</span><b>${lm(L.principal)}</b></div>
        <div class="luz-linha"><span>Complementar (${nS})</span><b>${lm(L.spot)}</b></div>
        <div class="luz-linha"><span>Consumo</span><b>${L.watts} W</b></div>
        ${mapa.luzes ? `<hr>
        <div class="luz-linha"><span>Média no plano de 0,75 m</span><b>${Math.round(mapa.media)} lux</b></div>
        <div class="luz-linha"><span>Ponto mais escuro</span><b>${Math.round(mapa.min)} lux</b></div>
        <div class="luz-linha"><span>Uniformidade</span><b>${G.num(mapa.u0)}</b></div>
        ${mapa.amb > 0 ? `<div class="luz-linha"><span>Vem da reflexão</span><b>${Math.round(mapa.amb)} lux</b></div>` : ''}
        <div class="luz-linha"><span>Luz nas paredes</span><b>${paredes(a)}</b></div>
        <p class="luz-msg ${mapa.u0 >= 0.3 ? 'ok' : 'falta'}">${mapa.u0 >= 0.3
          ? 'Distribuição equilibrada — sem buraco de sombra.'
          : 'Luz concentrada: sobra num ponto e falta em outro. Espalhe as luminárias ou abra o facho.'}</p>
        <p class="muted small" style="margin:6px 0 0">${a.refl === 'nenhuma'
          ? 'Só luz direta — a reflexão das paredes não está sendo contada.'
          : 'Inclui a luz que rebate nas paredes, teto e piso. Ordem das paredes: superior · direita · inferior · esquerda.'}
        A vista frontal pinta a parede com a luz que chega nela, sem descontar móveis na frente.</p>` : ''}
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

  /* ---------- sugestão de spots ---------- */
  let sugestoes = [], sugIdx = 0;

  const modeloAtual = () => App.presets.luzes[+($('#sugModelo') || {}).value || 0] || { beam: 38 };

  function renderSugestao() {
    const sel = $('#sugModelo');
    if (sel && !sel.options.length) {
      sel.innerHTML = App.presets.luzes
        .map((l, i) => l.kind === 'spot'
          ? `<option value="${i}">${l.nome} — ${l.lumens} lm, ${l.beam}°</option>` : '')
        .join('');
    }
    const box = $('#sugResultado');
    if (!box) return;
    if (!sugestoes.length) { box.innerHTML = ''; return; }
    const o = sugestoes[sugIdx];
    const a = S.activeArea();
    const vent = App.sugestao.obstaculos(a).length;
    box.innerHTML = `
      <div class="luz-card" style="margin-top:10px">
        <div class="luz-linha"><span><b>${esc(o.nome)}</b></span><b>${o.n} spot${o.n > 1 ? 's' : ''}</b></div>
        <div class="luz-linha"><span>Média no plano</span><b>${Math.round(o.media)} lux</b></div>
        <div class="luz-linha"><span>Ponto mais escuro</span><b>${Math.round(o.min)} lux</b></div>
        <div class="luz-linha"><span>Piso acima de ${Math.round(a.lux / 2)} lux</span><b>${Math.round(o.cobertura * 100)}%</b></div>
        <div class="luz-linha"><span>Uniformidade</span><b>${G.num(o.u0)}</b></div>
        <div class="luz-linha"><span>Consumo dos spots</span><b>${o.watts} W</b></div>
        <p class="luz-msg ${o.atende ? 'ok' : 'falta'}">${o.atende
          ? 'Fecha o alvo de ' + a.lux + ' lux e cobre o cômodo.'
          : o.media >= a.lux
            ? 'A média passa de ' + a.lux + ' lux, mas só ' + Math.round(o.cobertura * 100)
              + '% do piso recebe luz: sobra claridade embaixo dos spots e falta no resto.'
            : 'Ainda abaixo dos ' + a.lux + ' lux mesmo com o que já está instalado.'}</p>
        ${o.cobertura < 0.6 ? `<p class="muted small">Facho de ${modeloAtual().beam}° faz poça de luz.
          Para iluminação geral, conte com a luminária principal e use os spots como
          complemento, ou escolha um modelo de facho mais aberto (60° ou mais).</p>` : ''}
        ${vent ? '<p class="muted small">Nenhum spot cai sob as pás do ventilador nem colado nele.</p>' : ''}
        ${o.base && o.base.basta ? `<p class="muted small">O que já está no teto sozinho dá
          ${Math.round(o.base.media)} lux — acima do alvo. Esses spots entram como destaque
          (guarda-roupa, leitura, nicho), não por necessidade.</p>` : ''}
        ${o.emCama ? '<p class="muted small">Atenção: ' + o.emCama + ' spot(s) caem sobre a cama — luz no rosto de quem está deitado.</p>' : ''}
        <div class="prop-actions" style="margin-top:10px">
          <button class="btn btn-primary" data-sug="aplicar">Aplicar</button>
          <button class="btn" data-sug="outra">Ver outra (${sugIdx + 1}/${sugestoes.length})</button>
          <button class="btn" data-sug="cancelar">Cancelar</button>
        </div>
      </div>`;
    E.setPreviaSpots(o.pts);
  }

  function sugerir() {
    const a = S.activeArea();
    const i = +$('#sugModelo').value || 0;
    const modelo = App.presets.luzes[i];
    if (!modelo) return;
    sugestoes = App.sugestao.calcular(a, modelo, { recuo: 0.60, manterSpots: false });
    sugIdx = 0;
    if (!sugestoes.length) { toast('Não consegui montar uma grade nesse cômodo'); return; }
    renderSugestao();
    hint('Prévia na planta — os círculos numerados são os spots sugeridos');
  }

  function aplicarSugestao() {
    const o = sugestoes[sugIdx];
    if (!o) return;
    const a = S.activeArea();
    S.update(() => {
      a.items = a.items.filter((i) => !(i.type === 'light' && i.kind === 'spot'));
      o.spots.forEach((sp) => a.items.push(JSON.parse(JSON.stringify(sp))));
    });
    sugestoes = []; sugIdx = 0;
    E.setPreviaSpots(null);
    E.select(null);
    render();
    toast(o.n + ' spots posicionados — arraste qualquer um para ajustar');
  }

  /* ---------- marcenaria ---------- */
  function renderModelos() {
    const box = $('#modelos');
    if (!box || box.dataset.pronto) return;
    box.dataset.pronto = '1';
    box.innerHTML = App.marcenaria.MODELOS.map((mo, i) => `
      <button class="cat-item" data-modelo="${i}">
        <i style="background:#d9b98a"></i>
        <b>${esc(mo.nome)}</b>
        <span>${esc(mo.desc)}</span>
      </button>`).join('');
  }

  function renderMovel() {
    if (secao !== 'mob') return;
    renderModelos();
    const p = S.get(), m = S.activeMovel();
    $('#movelList').innerHTML = p.moveis.map((x) => `
      <li class="area-item ${x.id === p.movelId ? 'is-active' : ''}" data-id="${x.id}">
        <span class="area-swatch" style="background:${esc(x.cor)}"></span>
        <span class="area-info">
          <b>${esc(x.nome)}</b>
          <span>${G.num(x.w)} × ${G.num(x.d)} × ${G.num(x.h)} m · ${x.modulos.length} módulos</span>
        </span>
        <span class="area-acts">
          <button class="mini danger" data-act="del" title="Excluir móvel">🗑</button>
        </span>
      </li>`).join('');
    if (!m) { $('#movelForm').innerHTML = ''; return; }

    const chave = 'movel:' + m.id;
    if ($('#movelForm').dataset.chave !== chave) {
      $('#movelForm').dataset.chave = chave;
      $('#movelForm').innerHTML = `
        <hr>
        <div class="field"><label for="mNome">Nome</label><input id="mNome" value="${esc(m.nome)}"></div>
        <div class="row">${fieldNum('mW', 'Largura (m)', G.num(m.w))}${fieldNum('mD', 'Profundidade (m)', G.num(m.d))}</div>
        <div class="row">${fieldNum('mH', 'Altura (m)', G.num(m.h))}${fieldNum('mR', 'Rodapé (m)', G.num(m.rodape))}</div>
        <div class="row">${fieldNum('mE', 'Chapa (mm)', App.marcenaria.mm(m.esp))}
          <div class="field"><label for="mCor">Cor</label><input id="mCor" type="color" value="${esc(m.cor)}"></div></div>
        <div class="field"><label for="mObs">Recado para o marceneiro</label><input id="mObs" value="${esc(m.obs || '')}" placeholder="Ex.: MDF branco TX, puxador perfil"></div>
        <p class="muted small">De ponta a ponta: use a largura livre da parede. Na aba <b>Módulos</b> você divide o móvel em prateleiras, gavetas, cabideiro e portas.</p>`;
      wireMovel(m);
    } else {
      setVal('mNome', m.nome); setVal('mW', G.num(m.w)); setVal('mD', G.num(m.d));
      setVal('mH', G.num(m.h)); setVal('mR', G.num(m.rodape));
      setVal('mE', App.marcenaria.mm(m.esp)); setVal('mObs', m.obs || '');
    }
  }

  function wireMovel(m) {
    const M = App.marcenaria;
    const txt = (id, ap) => {
      const el = document.getElementById(id);
      el.addEventListener('change', () => { S.update(() => ap(el.value)); E.draw(); });
    };
    const num = (id, ap) => {
      const el = document.getElementById(id);
      el.addEventListener('change', () => {
        const v = G.parseNum(el.value);
        if (!Number.isFinite(v)) { renderMovel(); return; }
        S.update(() => { ap(v); M.redistribuir(m); });
        E.fit(); render();
      });
    };
    txt('mNome', (v) => { m.nome = v.trim() || 'Móvel'; });
    txt('mObs', (v) => { m.obs = v; });
    document.getElementById('mCor').addEventListener('input', (ev) =>
      S.update(() => { m.cor = ev.target.value; }));
    num('mW', (v) => { m.w = G.clamp(v, 0.3, 8); });
    num('mD', (v) => { m.d = G.clamp(v, 0.15, 1.2); });
    num('mH', (v) => { m.h = G.clamp(v, 0.3, 3.2); });
    num('mR', (v) => { m.rodape = G.clamp(v, 0, 0.4); });
    num('mE', (v) => { m.esp = G.clamp(v / 1000, 0.006, 0.05); });
  }

  function renderModulos() {
    if (secao !== 'mob') return;
    const M = App.marcenaria, m = S.activeMovel();
    if (!m) return;
    const vao = M.vaoTotal(m);
    const box = $('#modulosForm');
    const chave = 'mod:' + m.id + ':' + m.modulos.map((x) => x.id + x.tipo + x.qtd + x.portas + x.larg).join(',')
      + ':' + E.selModulo;
    if (box.dataset.chave === chave) return;
    box.dataset.chave = chave;

    box.innerHTML = `
      <p class="muted small">Vão livre total: <b>${G.m(vao)}</b> em ${m.modulos.length} módulo${m.modulos.length > 1 ? 's' : ''}.
      Mudar a largura de um módulo redistribui o resto.</p>
      <div class="prop-actions">
        <button class="btn" data-act="addmod">+ Módulo</button>
        <button class="btn" data-act="distribuir">Distribuir igualmente</button>
      </div>
      ${m.modulos.map((mo, i) => `
        <div class="mod-card ${mo.id === E.selModulo ? 'is-active' : ''}" data-mod="${mo.id}">
          <div class="prop-head">
            <span class="badge">Módulo ${i + 1}</span>
            <span class="grow"></span>
            ${m.modulos.length > 1 ? `<button class="mini danger" data-act="delmod" data-i="${i}" title="Excluir módulo">🗑</button>` : ''}
          </div>
          <div class="field"><label for="md-t-${i}">Conteúdo</label>
            <select id="md-t-${i}" data-i="${i}" data-campo="tipo">
              ${Object.entries(M.TIPOS).map(([k, v]) =>
                `<option value="${k}" ${mo.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select></div>
          <div class="row">
            ${fieldNum('md-l-' + i, 'Largura (m)', G.num(mo.larg))}
            ${mo.tipo === 'prateleiras' || mo.tipo === 'gavetas'
              ? fieldNum('md-q-' + i, mo.tipo === 'gavetas' ? 'Gavetas' : 'Prateleiras', mo.qtd)
              : '<div class="field"></div>'}
          </div>
          <div class="field"><label for="md-p-${i}">Portas na parte de cima</label>
            <select id="md-p-${i}" data-i="${i}" data-campo="portas">
              <option value="0" ${mo.portas === 0 ? 'selected' : ''}>Sem porta (aberto)</option>
              <option value="1" ${mo.portas === 1 ? 'selected' : ''}>1 folha</option>
              <option value="2" ${mo.portas === 2 ? 'selected' : ''}>2 folhas</option>
            </select></div>
          <div class="row">
            ${fieldNum('md-a-' + i, 'Armário embaixo (m)', G.num(mo.armario || 0))}
            <div class="field"><label for="md-ap-${i}">Portas do armário</label>
              <select id="md-ap-${i}" data-i="${i}" data-campo="portasArmario" ${mo.armario > 0 ? '' : 'disabled'}>
                <option value="1" ${mo.portasArmario === 1 ? 'selected' : ''}>1 folha</option>
                <option value="2" ${mo.portasArmario !== 1 ? 'selected' : ''}>2 folhas</option>
              </select></div>
          </div>
          <p class="muted small">0 = módulo aberto do chão ao topo. Com armário, o resto do
          módulo vira nicho ${mo.tipo === 'prateleiras' ? 'com prateleiras' : ''} em cima.</p>
        </div>`).join('')}`;

    m.modulos.forEach((mo, i) => {
      const ID = { tipo: 'md-t-', portas: 'md-p-', portasArmario: 'md-ap-' };
      const sel = (campo) => {
        const el = document.getElementById(ID[campo] + i);
        if (!el) return;
        el.addEventListener('change', () => {
          S.update(() => {
            if (campo === 'tipo') {
              mo.tipo = el.value;
              if (mo.tipo === 'gavetas' && !mo.qtd) mo.qtd = 4;
              if (mo.tipo === 'prateleiras' && !mo.qtd) mo.qtd = 4;
            } else mo[campo] = +el.value;
          });
          E.draw(); render();
        });
      };
      sel('tipo'); sel('portas'); sel('portasArmario');
      const arm = document.getElementById('md-a-' + i);
      if (arm) arm.addEventListener('change', () => {
        const v = G.parseNum(arm.value);
        if (!Number.isFinite(v)) { render(); return; }
        S.update(() => {
          mo.armario = G.clamp(v, 0, Math.max(0, App.marcenaria.alturaInterna(m) - 0.20));
          if (mo.armario > 0 && !mo.portasArmario) mo.portasArmario = 2;
        });
        E.draw(); render();
      });
      const larg = document.getElementById('md-l-' + i);
      larg.addEventListener('change', () => {
        const v = G.parseNum(larg.value);
        if (!Number.isFinite(v)) { render(); return; }
        S.update(() => App.marcenaria.ajustarLargura(m, i, v));
        E.draw(); render();
      });
      const q = document.getElementById('md-q-' + i);
      if (q) q.addEventListener('change', () => {
        const v = Math.round(G.parseNum(q.value));
        if (!Number.isFinite(v)) { render(); return; }
        S.update(() => { mo.qtd = G.clamp(v, 0, 12); });
        E.draw(); render();
      });
    });
  }

  function renderCorte() {
    if (secao !== 'mob') return;
    const M = App.marcenaria, m = S.activeMovel();
    if (!m) return;
    const pecas = M.planoDeCorte(m);
    const chapa = M.areaChapa(pecas);
    $('#corteResumo').innerHTML = `
      <div class="luz-card">
        <div class="luz-linha"><span>Móvel</span><b>${esc(m.nome)}</b></div>
        <div class="luz-linha"><span>Medidas (L × P × A)</span><b>${G.num(m.w)} × ${G.num(m.d)} × ${G.num(m.h)} m</b></div>
        <div class="luz-linha"><span>Peças</span><b>${pecas.reduce((t, p) => t + p.qtd, 0)}</b></div>
        <div class="luz-linha"><span>Chapa (sem perdas)</span><b>${G.num(chapa)} m²</b></div>
      </div>
      <p class="muted small">O PNG sai com a vista de frente cotada, o 3D e esta tabela — é o que o marceneiro precisa para orçar.</p>`;
    $('#corteTabela').innerHTML = `
      <table class="corte">
        <thead><tr><th>Peça</th><th>Larg.</th><th>Alt.</th><th>Qtd</th></tr></thead>
        <tbody>${pecas.map((p) => `
          <tr><td>${esc(p.nome)}<span class="mat">${esc(p.mat)}</span></td>
              <td>${p.larg}</td><td>${p.alt}</td><td>${p.qtd}</td></tr>`).join('')}</tbody>
      </table>
      <p class="muted small">Medidas em milímetros.</p>`;
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
      <div class="row">${fieldNum('pW', 'Potência (W)', Math.round(it.watts))}${fieldNum('pLm', 'Lúmens (lm)', Math.round(it.lumens))}</div>
      <p class="muted small">Mudar os watts recalcula os lúmens pela eficiência atual (${Math.round(it.lumens / Math.max(1, it.watts))} lm/W) e vice-versa.</p>
      <div class="field"><label for="pDim">Dimmer — ${it.dim}%</label>
        <input id="pDim" type="range" min="10" max="100" step="5" value="${it.dim}"></div>
      <div class="row">
        ${fieldNum('pBeam', 'Abertura do facho (°)', Math.round(it.beam))}
        ${fieldNum('pAltL', 'Altura de instalação (m)', G.num(it.base))}
      </div>
      <p class="muted small">Até 40° é spot dirigido, 60° médio, 90° ou mais difuso — a
      embalagem traz esse número. Nesta altura, o facho de ${Math.round(it.beam)}° faz uma
      poça de ${G.num(2 * Math.max(0.25, it.base - 0.75) * Math.tan(G.d2r(it.beam / 2)))} m
      de diâmetro no plano de trabalho.</p>
      <div class="row">
        <div class="field"><label for="pK">Temperatura</label>
          <select id="pK">
            ${[[2700, '2700 K — amarelada'], [3000, '3000 K — quente'], [4000, '4000 K — neutra'], [6500, '6500 K — fria']]
              .map(([k, t]) => `<option value="${k}" ${it.k === k ? 'selected' : ''}>${t}</option>`).join('')}
          </select></div>
        ${fieldNum('pX', 'X (m)', G.num(it.x))}
      </div>
      <div class="row">${fieldNum('pY', 'Y (m)', G.num(it.y))}<div class="field"></div></div>
      <p class="muted small">O mapa na planta mostra onde essa luz de fato bate, no plano de 0,75 m. Facho fechado concentra; pendente mais baixo ilumina menos área.</p>
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
      setVal('pW', Math.round(it.watts));
      setVal('pLm', Math.round(it.lumens));
      setVal('pBeam', Math.round(it.beam));
      setVal('pAltL', G.num(it.base));
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
      onNum('pW', (v) => {
        const efic = it.lumens / Math.max(1, it.watts);
        it.watts = G.clamp(Math.round(v), 1, 2000);
        it.lumens = Math.round(it.watts * efic);
      });
      onNum('pLm', (v) => {
        const efic = it.lumens / Math.max(1, it.watts);
        it.lumens = G.clamp(Math.round(v), 10, 40000);
        it.watts = Math.max(1, Math.round(it.lumens / Math.max(1, efic)));
      });
      onNum('pAltL', (v) => { it.base = G.clamp(v, 0.5, a.pd); });
      onNum('pX', (v) => { it.x = G.clamp(v, 0, a.w); });
      onNum('pY', (v) => { it.y = G.clamp(v, 0, a.h); });
      const dim = document.getElementById('pDim');
      dim.addEventListener('input', () => {
        S.live(() => { it.dim = +dim.value; });
        const lb = document.querySelector('label[for="pDim"]');
        if (lb) lb.textContent = 'Dimmer — ' + it.dim + '%';
        E.draw();
      });
      dim.addEventListener('change', () => S.update(() => { it.dim = +dim.value; }));
      onNum('pBeam', (v) => { it.beam = G.clamp(Math.round(v), 5, 170); });
      const kk = document.getElementById('pK');
      kk.addEventListener('change', () => S.update(() => { it.k = +kk.value; }));
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
      renderSugestao();
      renderMovel();
      renderModulos();
      renderCorte();
      renderProps();
      renderView();
      $('#btnUndo').disabled = !S.canUndo();
      $('#btnRedo').disabled = !S.canRedo();
    });
  }

  function renderView() {
    const m = E.mode, mob = m === 'mob';
    $$('#viewSwitch button').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === m));
    $$('#mobSwitch button').forEach((b) => b.classList.toggle('is-on', b.dataset.mob === E.mobView));
    $('#viewSwitch').hidden = mob;
    $('#mobSwitch').hidden = !mob;
    $('#wallNav').hidden = mob || m !== 'front';
    $('#toolbar').hidden = mob || m === 'front';
    if (m === 'front') $('#wallName').textContent = 'Parede ' + App.elev.NOMES[E.frontWall];
    const mv = S.activeMovel(), ar = S.activeArea();
    if (mob && mv) {
      $('#areaChip').textContent = `${mv.nome} · ${G.num(mv.w)} × ${G.num(mv.d)} × ${G.num(mv.h)} m`;
    } else if (!mob && ar) {
      $('#areaChip').textContent = `${ar.name} · ${G.num(ar.w)} × ${G.num(ar.h)} m · ${G.m2(ar.w * ar.h)}`;
    }
  }

  /* ---------- import / export ---------- */
  function exportJSON() {
    const nome = (S.get().name || 'planta').replace(/\s+/g, '-').toLowerCase() + '.json';
    App.baixar(nome, JSON.stringify(S.get(), null, 2)).then((r) => {
      toast(r === 'salvo' ? 'Projeto exportado' : r === 'recusado' ? 'Download cancelado' : 'Não consegui salvar');
    });
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

    $('#areaModelos').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-area]');
      if (!b) return;
      const modelo = App.presets.areas[+b.dataset.area];
      const nova = App.presets.criarArea(modelo, S.uid);
      S.update((p) => { p.areas.push(nova); p.activeId = nova.id; });
      E.select(null);
      E.fit();
      if (isMobile()) openPanel(false);
      toast(nova.name + ' criada — ' + G.num(nova.w) + ' × ' + G.num(nova.h) + ' m');
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

    $('#btnMapa').addEventListener('click', () => { E.setMapaLuz(!E.mapaLuz); render(); });

    $('#reflSel').addEventListener('change', () => {
      S.update(() => { S.activeArea().refl = $('#reflSel').value; });
      E.draw();
    });

    $('#btnSugerir').addEventListener('click', sugerir);
    $('#sugResultado').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sug]');
      if (!b) return;
      const act = b.dataset.sug;
      if (act === 'aplicar') aplicarSugestao();
      if (act === 'outra') { sugIdx = (sugIdx + 1) % sugestoes.length; renderSugestao(); }
      if (act === 'cancelar') { sugestoes = []; E.setPreviaSpots(null); renderSugestao(); }
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

    $('#secSwitch').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sec]');
      if (!b) return;
      setSecao(b.dataset.sec);
      if (b.dataset.sec === 'mob') hint('Móvel sob medida: dimensões na aba Móvel, divisões na aba Módulos');
    });
    $('#mobSwitch').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-mob]');
      if (!b) return;
      E.setMovelView(b.dataset.mob);
      if (b.dataset.mob === '3d') hint('Arraste para girar o móvel');
    });

    $('#modelos').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-modelo]');
      if (!b) return;
      const mod = App.marcenaria.MODELOS[+b.dataset.modelo];
      const novo = App.marcenaria.doModelo(mod, S.uid(), S.uid);
      S.update((p) => { p.moveis.push(novo); p.movelId = novo.id; });
      E.selecionarModulo(null);
      E.fit();
      toast(mod.nome + ' criado');
    });

    $('#btnNovoMovel').addEventListener('click', () => {
      const novo = App.marcenaria.novoMovel(S.uid());
      novo.nome = 'Móvel ' + (S.get().moveis.length + 1);
      S.update((p) => { p.moveis.push(novo); p.movelId = novo.id; });
      E.fit();
      toast('Móvel criado');
    });

    $('#movelList').addEventListener('click', async (ev) => {
      const li = ev.target.closest('.area-item');
      if (!li) return;
      const id = li.dataset.id;
      const act = ev.target.closest('[data-act]');
      if (act && act.dataset.act === 'del') {
        if (S.get().moveis.length === 1) { toast('Mantenha ao menos um móvel'); return; }
        const alvo = S.get().moveis.find((x) => x.id === id);
        if (await confirmDlg('Excluir móvel', `Excluir "${alvo.nome}"?`)) {
          S.update((p) => {
            p.moveis = p.moveis.filter((x) => x.id !== id);
            if (p.movelId === id) p.movelId = p.moveis[0].id;
          });
          E.fit();
        }
        return;
      }
      S.update((p) => { p.movelId = id; });
      E.selecionarModulo(null);
      E.fit();
    });

    $('#modulosForm').addEventListener('click', (ev) => {
      const m = S.activeMovel();
      const act = ev.target.closest('[data-act]');
      if (act) {
        const a = act.dataset.act;
        if (a === 'addmod') {
          S.update(() => {
            m.modulos.push({ id: S.uid(), larg: 0.4, tipo: 'prateleiras', qtd: 4, portas: 0 });
            App.marcenaria.redistribuir(m);
          });
        }
        if (a === 'distribuir') S.update(() => App.marcenaria.redistribuir(m));
        if (a === 'delmod') {
          S.update(() => {
            m.modulos.splice(+act.dataset.i, 1);
            App.marcenaria.redistribuir(m);
          });
        }
        E.draw(); render();
        return;
      }
      const card = ev.target.closest('.mod-card');
      if (card && !ev.target.closest('input,select')) E.selecionarModulo(card.dataset.mod);
    });

    $('#btnExportMovel').addEventListener('click', () => E.exportPNG());

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
      if (act === 'png') E.exportPNG();
      if (act === 'areas-png') App.exportar.areas(S.get(), toast);
      if (act === 'areas-csv') App.exportar.csvAreas(S.get(), toast);
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

  async function adaptMenu() {
    if (!embedded) return;
    if (await App.baixar.disponivel()) return;   // o visualizador aceita downloads
    ['png', 'areas-png', 'areas-csv', 'export', 'import'].forEach((act) => {
      const b = document.querySelector('#moreMenu [data-act="' + act + '"]');
      if (b) b.hidden = true;
    });
    const btn = $('#btnExportMovel');
    if (btn) btn.hidden = true;
    const note = document.createElement('p');
    note.className = 'muted small';
    note.style.padding = '8px 12px';
    note.style.margin = '0';
    note.textContent = 'Exportar arquivos só funciona com o site aberto em aba própria.';
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

  return { init, render, toast, hint, setTab, setSecao, isMobile, openPanel, activeTab };
})();
