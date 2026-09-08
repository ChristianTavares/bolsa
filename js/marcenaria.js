/* Marcenaria: móvel sob medida de ponta a ponta.
   Vista de frente cotada, vista 3D e plano de corte para mandar ao marceneiro.
   Medidas do modelo em metros; o plano de corte sai em milímetros. */
window.App = window.App || {};

App.marcenaria = (function () {
  const G = App.geo;

  const TIPOS = {
    prateleiras: 'Prateleiras',
    gavetas: 'Gavetas',
    cabide: 'Cabideiro',
    nicho: 'Nicho aberto',
  };

  function novoMovel(id) {
    return {
      id,
      nome: 'Móvel sob medida',
      w: 2.40, d: 0.55, h: 2.40,
      rodape: 0.10, esp: 0.018, cor: '#d9b98a',
      obs: '',
      modulos: [
        { id: id + 'a', larg: 0.78, tipo: 'cabide', qtd: 1, portas: 2 },
        { id: id + 'b', larg: 0.78, tipo: 'prateleiras', qtd: 4, portas: 0 },
        { id: id + 'c', larg: 0.78, tipo: 'gavetas', qtd: 4, portas: 0 },
      ],
    };
  }

  /* Modelos prontos: entram já configurados e depois é só ajustar a medida. */
  const MODELOS = [
    {
      nome: 'Estante com armário', w: 1.00, d: 0.47, h: 2.30, rodape: 0.10,
      desc: '1,00 × 0,47 × 2,30 m · armário de 2 portas embaixo e nichos abertos em cima',
      modulos: [{ tipo: 'prateleiras', qtd: 3, portas: 0, armario: 0.70, portasArmario: 2 }],
    },
    {
      nome: 'Guarda-roupa 3 portas', w: 1.50, d: 0.60, h: 2.30, rodape: 0.10,
      desc: '1,50 × 0,60 × 2,30 m · cabideiro, prateleiras e gavetas',
      modulos: [
        { tipo: 'cabide', qtd: 1, portas: 1, armario: 0, portasArmario: 2 },
        { tipo: 'prateleiras', qtd: 4, portas: 1, armario: 0, portasArmario: 2 },
        { tipo: 'gavetas', qtd: 4, portas: 0, armario: 0, portasArmario: 2 },
      ],
    },
    {
      nome: 'Balcão de TV', w: 1.80, d: 0.40, h: 0.60, rodape: 0.05,
      desc: '1,80 × 0,40 × 0,60 m · gavetas no meio e portas nas laterais',
      modulos: [
        { tipo: 'nicho', qtd: 0, portas: 1, armario: 0, portasArmario: 2 },
        { tipo: 'gavetas', qtd: 2, portas: 0, armario: 0, portasArmario: 2 },
        { tipo: 'nicho', qtd: 0, portas: 1, armario: 0, portasArmario: 2 },
      ],
    },
  ];

  function doModelo(mod, id, uid) {
    const m = novoMovel(id);
    Object.assign(m, { nome: mod.nome, w: mod.w, d: mod.d, h: mod.h, rodape: mod.rodape });
    m.modulos = mod.modulos.map((x, i) => Object.assign({ id: uid ? uid() : id + i, larg: 0.5 }, x));
    redistribuir(m);
    return m;
  }

  /* Soma dos vãos livres: largura total menos as laterais e as divisórias. */
  const vaoTotal = (m) => m.w - 2 * m.esp - Math.max(0, m.modulos.length - 1) * m.esp;
  const alturaInterna = (m) => m.h - m.rodape - 2 * m.esp;

  function redistribuir(m) {
    const v = vaoTotal(m) / m.modulos.length;
    m.modulos.forEach((mo) => { mo.larg = Math.round(v * 1000) / 1000; });
  }

  /* Muda um módulo e devolve a diferença aos outros, sem estourar o vão. */
  function ajustarLargura(m, idx, nova) {
    const total = vaoTotal(m);
    const outros = m.modulos.filter((_, i) => i !== idx);
    const min = 0.12;
    nova = G.clamp(nova, min, total - outros.length * min);
    const sobra = total - nova;
    const somaOutros = outros.reduce((t, o) => t + o.larg, 0) || 1;
    m.modulos[idx].larg = Math.round(nova * 1000) / 1000;
    outros.forEach((o) => {
      o.larg = Math.round(Math.max(min, (o.larg / somaOutros) * sobra) * 1000) / 1000;
    });
    // resíduo de arredondamento vai para o último
    const dif = total - m.modulos.reduce((t, o) => t + o.larg, 0);
    const ult = m.modulos[m.modulos.length - 1];
    ult.larg = Math.round((ult.larg + dif) * 1000) / 1000;
  }

  /* Divisão do módulo entre o armário fechado da base e a parte de cima. */
  function secoes(m, mo) {
    const hInt = alturaInterna(m);
    const arm = G.clamp(+mo.armario || 0, 0, Math.max(0, hInt - 0.20));
    const y0 = m.rodape + m.esp + (arm > 0 ? arm + m.esp : 0);
    const hA = hInt - (arm > 0 ? arm + m.esp : 0);
    return { arm, y0, hA };
  }

  /* x da borda esquerda do vão de cada módulo. */
  function offsets(m) {
    const out = [];
    let x = m.esp;
    m.modulos.forEach((mo) => { out.push(x); x += mo.larg + m.esp; });
    return out;
  }

  /* --------- caixas 3D (x direita, y cima, z frente) --------- */
  function caixas(m) {
    const cx = [];
    const put = (x, y, z, w, h, d, cor, nome) => cx.push({ x, y, z, w, h, d, cor, nome });
    const e = m.esp, R = m.rodape, H = m.h, W = m.w, D = m.d;
    const corpo = m.cor;
    const escuro = '#b99a6f';

    put(0, R, 0, e, H - R, D, corpo, 'lateral');
    put(W - e, R, 0, e, H - R, D, corpo, 'lateral');
    put(e, R, 0, W - 2 * e, e, D, corpo, 'base');
    put(e, H - e, 0, W - 2 * e, e, D, corpo, 'topo');
    put(e, R + e, 0, W - 2 * e, H - R - 2 * e, 0.006, '#c9ad84', 'fundo');
    put(0.05, 0, 0.05, W - 0.1, R, D - 0.05, escuro, 'rodapé');

    const offs = offsets(m);
    const yBase = R + e, hInt = alturaInterna(m);
    m.modulos.forEach((mo, i) => {
      const x0 = offs[i];
      if (i < m.modulos.length - 1) put(x0 + mo.larg, R, 0, e, H - R, D, corpo, 'divisória');

      const a = secoes(m, mo);
      // armário fechado na base
      if (a.arm > 0) {
        put(x0, yBase + a.arm, 0.01, mo.larg, e, D - 0.01, corpo, 'tampo do armário');
        const np = Math.max(1, mo.portasArmario || 2);
        const lp = np === 2 ? (mo.larg - 0.006) / 2 : mo.larg - 0.006;
        for (let k = 0; k < np; k++) {
          put(x0 + 0.003 + k * (lp + 0.003), yBase, D - 0.018, lp, a.arm, 0.018, corpo, 'porta do armário');
          const px = np === 2 && k === 0 ? x0 + lp - 0.09 : x0 + 0.003 + k * (lp + 0.003) + 0.02;
          put(px, yBase + a.arm - 0.16, D, 0.014, 0.12, 0.02, '#8d93a3', 'puxador');
        }
      }

      const y0 = a.y0, hA = a.hA;
      if (mo.tipo === 'prateleiras' || mo.tipo === 'nicho') {
        const n = mo.tipo === 'nicho' ? 0 : Math.max(0, mo.qtd);
        for (let k = 1; k <= n; k++) {
          put(x0, y0 + (hA * k) / (n + 1), 0.01, mo.larg, e, D - 0.02, corpo, 'prateleira');
        }
      } else if (mo.tipo === 'cabide') {
        const yC = y0 + hA * 0.72;
        put(x0, yC, 0.01, mo.larg, e, D - 0.02, corpo, 'prateleira');
        put(x0 + 0.02, yC - 0.06, D / 2 - 0.015, mo.larg - 0.04, 0.03, 0.03, '#9aa1b0', 'cabide');
      } else if (mo.tipo === 'gavetas') {
        const n = Math.max(1, mo.qtd);
        const hg = hA / n;
        for (let k = 0; k < n; k++) {
          put(x0 + 0.003, y0 + k * hg + 0.003, D - 0.018, mo.larg - 0.006, hg - 0.006, 0.018, corpo, 'gaveta');
          put(x0 + mo.larg / 2 - 0.06, y0 + k * hg + hg - 0.055, D, 0.12, 0.012, 0.02, '#8d93a3', 'puxador');
        }
      }

      if (mo.portas > 0) {
        const lp = mo.portas === 2 ? (mo.larg - 0.006) / 2 : mo.larg - 0.006;
        for (let k = 0; k < mo.portas; k++) {
          put(x0 + 0.003 + k * (lp + 0.003), y0, D - 0.018, lp, hA, 0.018, corpo, 'porta');
          const px = mo.portas === 2 && k === 0 ? x0 + lp - 0.09 : x0 + 0.003 + k * (lp + 0.003) + 0.02;
          put(px, y0 + hA / 2 - 0.06, D, 0.014, 0.12, 0.02, '#8d93a3', 'puxador');
        }
      }
    });
    return cx;
  }

  /* --------- plano de corte --------- */
  const mm = (v) => Math.round(v * 1000);

  function planoDeCorte(m) {
    const pecas = [];
    const add = (nome, larg, alt, qtd, mat) => {
      const chave = nome + '|' + mm(larg) + '|' + mm(alt) + '|' + (mat || '');
      const achou = pecas.find((p) => p.chave === chave);
      if (achou) achou.qtd += qtd;
      else pecas.push({ chave, nome, larg: mm(larg), alt: mm(alt), qtd, mat: mat || 'MDF 18 mm' });
    };
    const hInt = alturaInterna(m);
    add('Lateral', m.d, m.h - m.rodape, 2);
    add('Base', m.w - 2 * m.esp, m.d, 1);
    add('Tampo', m.w - 2 * m.esp, m.d, 1);
    if (m.modulos.length > 1) add('Divisória', m.d, m.h - m.rodape - 2 * m.esp, m.modulos.length - 1);
    add('Rodapé', m.w - 0.10, m.rodape, 1);
    add('Fundo', m.w - 2 * m.esp, hInt, 1, 'MDF 6 mm');

    m.modulos.forEach((mo) => {
      const sec = secoes(m, mo);
      if (sec.arm > 0) {
        add('Tampo do armário', mo.larg, m.d - 0.01, 1);
        const np = Math.max(1, mo.portasArmario || 2);
        add('Porta do armário', np === 2 ? (mo.larg - 0.006) / 2 : mo.larg - 0.006, sec.arm, np);
        add('Dobradiça', 0.035, 0.035, np * 2, 'Ferragem');
      }
      if (mo.tipo === 'prateleiras') add('Prateleira', mo.larg, m.d - 0.02, Math.max(0, mo.qtd));
      if (mo.tipo === 'cabide') {
        add('Prateleira', mo.larg, m.d - 0.02, 1);
        add('Barra de cabide', mo.larg - 0.04, 0.03, 1, 'Alumínio Ø 30 mm');
      }
      if (mo.tipo === 'gavetas') {
        const n = Math.max(1, mo.qtd), hg = sec.hA / n;
        add('Frente de gaveta', mo.larg - 0.006, hg - 0.006, n);
        add('Lateral de gaveta', m.d - 0.06, hg - 0.08, 2 * n, 'MDF 15 mm');
        add('Fundo de gaveta', mo.larg - 0.08, m.d - 0.06, n, 'MDF 6 mm');
        add('Corrediça telescópica', m.d - 0.05, 0.045, n, 'Ferragem');
      }
      if (mo.portas > 0) {
        const lp = mo.portas === 2 ? (mo.larg - 0.006) / 2 : mo.larg - 0.006;
        add('Porta', lp, sec.hA, mo.portas);
        add('Dobradiça', 0.035, 0.035, mo.portas * 3, 'Ferragem');
      }
    });
    return pecas;
  }

  function areaChapa(pecas) {
    return pecas
      .filter((p) => p.mat.indexOf('MDF') === 0)
      .reduce((t, p) => t + (p.larg / 1000) * (p.alt / 1000) * p.qtd, 0);
  }

  /* --------- vista de frente, cotada --------- */
  function desenhaFrente(ctx, m, v, W, H, o) {
    o = o || {};
    const C = App.render.C;
    const X = (x) => x * v.scale + v.ox;
    const Y = (y) => v.oy - y * v.scale;
    const sel = o.selecionado;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = o.exportMode ? '#ffffff' : C.bg;
    ctx.fillRect(0, 0, W, H);

    // piso e parede de fundo
    ctx.fillStyle = '#eef0f6';
    ctx.fillRect(X(-0.3), Y(m.h + 0.35), (m.w + 0.6) * v.scale, (m.h + 0.35) * v.scale);
    ctx.strokeStyle = C.wallEdge; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(-0.35), Y(0)); ctx.lineTo(X(m.w + 0.35), Y(0)); ctx.stroke();

    // corpo
    ctx.fillStyle = m.cor;
    ctx.fillRect(X(0), Y(m.h), m.w * v.scale, m.h * v.scale);
    ctx.strokeStyle = 'rgba(40,46,66,.65)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(X(0), Y(m.h), m.w * v.scale, m.h * v.scale);

    // rodapé
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(X(0), Y(m.rodape), m.w * v.scale, m.rodape * v.scale);

    const offs = offsets(m);
    const yBase = m.rodape + m.esp, hInt = alturaInterna(m);

    m.modulos.forEach((mo, i) => {
      const x0 = offs[i];
      const ativo = sel === mo.id;
      const sec = secoes(m, mo);
      const yA = sec.y0, hA = sec.hA;
      // vão do módulo
      ctx.fillStyle = '#fbfaf7';
      ctx.fillRect(X(x0), Y(yBase + hInt), mo.larg * v.scale, hInt * v.scale);
      ctx.strokeStyle = ativo ? C.brand : 'rgba(40,46,66,.45)';
      ctx.lineWidth = ativo ? 2.5 : 1;
      ctx.strokeRect(X(x0), Y(yBase + hInt), mo.larg * v.scale, hInt * v.scale);

      // armário fechado da base
      if (sec.arm > 0) {
        const np = Math.max(1, mo.portasArmario || 2);
        const lp = mo.larg / np;
        for (let k = 0; k < np; k++) {
          const px = x0 + k * lp;
          ctx.fillStyle = 'rgba(217,185,138,.65)';
          ctx.fillRect(X(px) + 1, Y(yBase + sec.arm) + 1, lp * v.scale - 2, sec.arm * v.scale - 2);
          ctx.strokeStyle = 'rgba(40,46,66,.55)'; ctx.lineWidth = 1.2;
          ctx.strokeRect(X(px) + 1, Y(yBase + sec.arm) + 1, lp * v.scale - 2, sec.arm * v.scale - 2);
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(40,46,66,.35)';
          ctx.beginPath();
          const dobra = (np === 2 && k === 1) ? px + lp : px;
          ctx.moveTo(X(dobra), Y(yBase));
          ctx.lineTo(X(np === 2 && k === 1 ? px : px + lp), Y(yBase + sec.arm / 2));
          ctx.lineTo(X(dobra), Y(yBase + sec.arm));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#8d93a3';
          const pux = (np === 2 && k === 1) ? px + 0.02 : px + lp - 0.03;
          ctx.fillRect(X(pux), Y(yBase + sec.arm - 0.10), 4, 0.10 * v.scale);
        }
        ctx.fillStyle = 'rgba(40,46,66,.6)';
        ctx.fillRect(X(x0), Y(yBase + sec.arm) - Math.max(2, m.esp * v.scale), mo.larg * v.scale, Math.max(2, m.esp * v.scale));
      }

      if (mo.tipo === 'prateleiras') {
        const n = Math.max(0, mo.qtd);
        ctx.fillStyle = 'rgba(40,46,66,.55)';
        for (let k = 1; k <= n; k++) {
          const y = yA + (hA * k) / (n + 1);
          ctx.fillRect(X(x0), Y(y) - Math.max(1.5, m.esp * v.scale), mo.larg * v.scale, Math.max(2, m.esp * v.scale));
        }
      } else if (mo.tipo === 'cabide') {
        const y = yA + hA * 0.72;
        ctx.fillStyle = 'rgba(40,46,66,.55)';
        ctx.fillRect(X(x0), Y(y), mo.larg * v.scale, Math.max(2, m.esp * v.scale));
        ctx.strokeStyle = '#8d93a3'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(X(x0 + 0.02), Y(y - 0.06)); ctx.lineTo(X(x0 + mo.larg - 0.02), Y(y - 0.06));
        ctx.stroke();
      } else if (mo.tipo === 'gavetas') {
        const n = Math.max(1, mo.qtd), hg = hA / n;
        for (let k = 0; k < n; k++) {
          const y0 = yA + k * hg;
          ctx.fillStyle = '#f3ece1';
          ctx.fillRect(X(x0) + 2, Y(y0 + hg) + 2, mo.larg * v.scale - 4, hg * v.scale - 4);
          ctx.strokeStyle = 'rgba(40,46,66,.45)'; ctx.lineWidth = 1;
          ctx.strokeRect(X(x0) + 2, Y(y0 + hg) + 2, mo.larg * v.scale - 4, hg * v.scale - 4);
          ctx.fillStyle = '#8d93a3';
          const pw = Math.min(0.12, mo.larg * 0.5) * v.scale;
          ctx.fillRect(X(x0 + mo.larg / 2) - pw / 2, Y(y0 + hg - 0.05), pw, 4);
        }
      }

      if (mo.portas > 0) {
        const lp = mo.portas === 2 ? mo.larg / 2 : mo.larg;
        for (let k = 0; k < mo.portas; k++) {
          const px = x0 + k * lp;
          ctx.fillStyle = 'rgba(217,185,138,.55)';
          ctx.fillRect(X(px) + 1, Y(yA + hA) + 1, lp * v.scale - 2, hA * v.scale - 2);
          ctx.strokeStyle = 'rgba(40,46,66,.55)'; ctx.lineWidth = 1.2;
          ctx.strokeRect(X(px) + 1, Y(yA + hA) + 1, lp * v.scale - 2, hA * v.scale - 2);
          // sentido de abertura
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = 'rgba(40,46,66,.35)';
          ctx.beginPath();
          const dobra = (mo.portas === 2 && k === 1) ? px + lp : px;
          ctx.moveTo(X(dobra), Y(yA));
          ctx.lineTo(X(mo.portas === 2 && k === 1 ? px : px + lp), Y(yA + hA / 2));
          ctx.lineTo(X(dobra), Y(yA + hA));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#8d93a3';
          const pux = (mo.portas === 2 && k === 1) ? px + 0.02 : px + lp - 0.03;
          ctx.fillRect(X(pux), Y(yA + hA / 2 + 0.06), 4, 0.12 * v.scale);
        }
      }

      // rótulo do módulo
      ctx.fillStyle = 'rgba(28,32,48,.6)';
      ctx.font = '600 11px -apple-system,Segoe UI,Roboto,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      if (mo.larg * v.scale > 60) {
        ctx.fillText(TIPOS[mo.tipo] + (mo.portas ? ' + porta' : '') + (sec.arm > 0 ? ' + armário' : ''),
          X(x0 + mo.larg / 2), Y(m.h) - 20, mo.larg * v.scale);
      }
      // cota do módulo
      App.render.dimension(ctx, X(x0), Y(0) + 30, X(x0 + mo.larg), Y(0) + 30, G.num(mo.larg) + ' m', C.dim);
    });

    App.render.dimension(ctx, X(0), Y(0) + 62, X(m.w), Y(0) + 62, G.m(m.w), C.dim);
    App.render.dimension(ctx, X(0) - 32, Y(0), X(0) - 32, Y(m.h), G.m(m.h), C.dim);
    App.render.dimension(ctx, X(m.w) + 32, Y(0), X(m.w) + 32, Y(m.rodape), G.m(m.rodape), C.dim);

    ctx.fillStyle = 'rgba(28,32,48,.5)';
    ctx.font = '600 13px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(m.nome + ' · profundidade ' + G.m(m.d), X(m.w / 2), Y(m.h) - 34);
  }

  /* --------- vista 3D --------- */
  function projetar(p, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y2 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;
    return { x: x1, y: y2, z: z2 };
  }

  const FACES = [
    { idx: [0, 1, 2, 3], n: [0, 0, 1] },   // frente (z+)
    { idx: [5, 4, 7, 6], n: [0, 0, -1] },  // fundo
    { idx: [4, 0, 3, 7], n: [-1, 0, 0] },  // esquerda
    { idx: [1, 5, 6, 2], n: [1, 0, 0] },   // direita
    { idx: [3, 2, 6, 7], n: [0, 1, 0] },   // topo
    { idx: [4, 5, 1, 0], n: [0, -1, 0] },  // base
  ];

  function tom(cor, f) {
    const n = parseInt(cor.slice(1), 16);
    const r = G.clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
    const g = G.clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
    const b = G.clamp(Math.round((n & 255) * f), 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  function desenha3D(ctx, m, v, W, H, o) {
    o = o || {};
    const C = App.render.C;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = o.exportMode ? '#ffffff' : C.bg;
    ctx.fillRect(0, 0, W, H);

    const cxs = caixas(m);
    const cxm = m.w / 2, cym = m.h / 2, czm = m.d / 2;
    const P = (x, y, z) => {
      const q = projetar({ x: x - cxm, y: y - cym, z: z - czm }, v.yaw, v.pitch);
      return { sx: v.cx + q.x * v.scale, sy: v.cy - q.y * v.scale, z: q.z };
    };

    const lista = cxs.map((b) => {
      const vs = [
        P(b.x, b.y, b.z + b.d), P(b.x + b.w, b.y, b.z + b.d),
        P(b.x + b.w, b.y + b.h, b.z + b.d), P(b.x, b.y + b.h, b.z + b.d),
        P(b.x, b.y, b.z), P(b.x + b.w, b.y, b.z),
        P(b.x + b.w, b.y + b.h, b.z), P(b.x, b.y + b.h, b.z),
      ];
      const zc = vs.reduce((t, p) => t + p.z, 0) / 8;
      return { b, vs, zc };
    }).sort((a, c) => a.zc - c.zc);   // do fundo para a frente

    lista.forEach(({ b, vs }) => {
      FACES.forEach((f) => {
        const p = f.idx.map((i) => vs[i]);
        // área com sinal: descarta as faces que apontam para longe
        let a = 0;
        for (let i = 0; i < 4; i++) {
          const q = p[i], r = p[(i + 1) % 4];
          a += q.sx * r.sy - r.sx * q.sy;
        }
        if (a >= 0) return;
        const nv = projetar({ x: f.n[0], y: f.n[1], z: f.n[2] }, v.yaw, v.pitch);
        const luz = G.clamp(0.55 + 0.45 * (nv.y * 0.6 + nv.z * 0.5 + 0.25), 0.4, 1.12);
        ctx.beginPath();
        ctx.moveTo(p[0].sx, p[0].sy);
        for (let i = 1; i < 4; i++) ctx.lineTo(p[i].sx, p[i].sy);
        ctx.closePath();
        ctx.fillStyle = tom(b.cor, luz);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,46,66,.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });

    ctx.fillStyle = 'rgba(28,32,48,.5)';
    ctx.font = '600 13px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const medidas = `${G.num(m.w)} × ${G.num(m.d)} × ${G.num(m.h)} m`;
    ctx.fillText(W < 560 ? medidas + ' (L × P × A)' : `${m.nome} · ${medidas} (L × P × A)`, W / 2, H - 16);
  }

  return {
    TIPOS, MODELOS, novoMovel, doModelo, vaoTotal, alturaInterna, secoes, redistribuir, ajustarLargura,
    offsets, caixas, planoDeCorte, areaChapa, desenhaFrente, desenha3D, mm,
  };
})();
