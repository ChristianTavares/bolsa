/* Mapa de iluminância: onde a luz das luminárias realmente bate.
   Modelo de fonte pontual com facho cônico, sobre o plano de trabalho (0,75 m):
   E = I · cos³θ / h², com I = fluxo / ângulo sólido do facho. */
window.App = window.App || {};

App.lightmap = (function () {
  const G = App.geo;
  const PLANO = 0.75;        // altura do plano de trabalho, em metros
  const CELULA = 0.05;       // resolução do mapa
  const MAXC = 220;

  /* Escala falsecolor em função do alvo do ambiente. */
  const PARADAS = [
    [0.00, [26, 32, 66]],
    [0.25, [40, 84, 160]],
    [0.50, [32, 150, 148]],
    [0.75, [126, 188, 92]],
    [1.00, [242, 200, 66]],
    [1.60, [252, 244, 226]],
  ];

  function cor(r) {
    if (r <= 0) return PARADAS[0][1];
    for (let i = 1; i < PARADAS.length; i++) {
      if (r <= PARADAS[i][0] || i === PARADAS.length - 1) {
        const [r0, c0] = PARADAS[i - 1], [r1, c1] = PARADAS[i];
        const t = G.clamp((r - r0) / (r1 - r0), 0, 1);
        return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * t));
      }
    }
    return PARADAS[PARADAS.length - 1][1];
  }

  const fluxo = (l) => l.lumens * ((l.dim == null ? 100 : l.dim) / 100);

  /* Refletâncias típicas por acabamento das paredes (teto e piso fixos). */
  const REFL = {
    claras:  { parede: 0.60, teto: 0.70, piso: 0.20 },
    medias:  { parede: 0.45, teto: 0.70, piso: 0.20 },
    escuras: { parede: 0.25, teto: 0.60, piso: 0.15 },
  };

  /* Parcela que volta das superfícies, pela aproximação da esfera integradora:
     E = Φ·ρ / (S·(1-ρ)). Uniforme no ambiente — é o que levanta os cantos. */
  function indireta(area, luzes) {
    const r = REFL[area.refl || 'claras'];
    if (!r) return 0;                       // 'nenhuma' = só luz direta
    const piso = area.w * area.h;
    const paredes = 2 * (area.w + area.h) * area.pd;
    const S = piso * 2 + paredes;
    if (S <= 0) return 0;
    const rho = (r.piso * piso + r.teto * piso + r.parede * paredes) / S;
    const phi = luzes.reduce((t, l) => t + fluxo(l), 0);
    return (phi * rho) / (S * (1 - rho));
  }

  /* Ponto e normal de uma parede, a partir da posição ao longo dela. */
  function pontoParede(area, wall, s) {
    if (wall === 'top') return { x: s, y: 0, nx: 0, ny: 1 };
    if (wall === 'bottom') return { x: area.w - s, y: area.h, nx: 0, ny: -1 };
    if (wall === 'left') return { x: 0, y: area.h - s, nx: 1, ny: 0 };
    return { x: area.w, y: s, nx: -1, ny: 0 };
  }

  /* Iluminância vertical num ponto da parede (o que faz a parede parecer clara). */
  function contribuiParede(l, area, p, z) {
    const meio = G.d2r((l.beam || 120) / 2);
    const omega = 2 * Math.PI * (1 - Math.cos(meio));
    const I0 = fluxo(l) / Math.max(0.05, omega);
    const lz = l.base != null ? l.base : area.pd;
    const vx = p.x - l.x, vy = p.y - l.y, vz = z - lz;
    const d = Math.hypot(vx, vy, vz);
    if (d < 0.05) return 0;
    const cosT = -vz / d;                       // ângulo em relação ao eixo do facho
    if (cosT <= 0) return 0;
    const th = Math.acos(G.clamp(cosT, -1, 1));
    if (th >= meio) return 0;
    const borda = meio * 0.82;
    const suave = th <= borda ? 1 : Math.max(0, 1 - (th - borda) / (meio - borda));
    const cosPsi = -(vx * p.nx + vy * p.ny) / d;  // incidência na face da parede
    if (cosPsi <= 0) return 0;
    return (I0 * cosPsi / (d * d)) * suave;
  }

  /* Iluminância de uma luminária num ponto do plano de trabalho. */
  function contribui(l, area, px, py) {
    const meio = G.d2r((l.beam || 120) / 2);
    const omega = 2 * Math.PI * (1 - Math.cos(meio));
    const I0 = fluxo(l) / Math.max(0.05, omega);
    const h = Math.max(0.25, (l.base != null ? l.base : area.pd) - PLANO);
    const d = Math.hypot(px - l.x, py - l.y);
    const cosT = h / Math.sqrt(h * h + d * d);
    const th = Math.acos(G.clamp(cosT, -1, 1));
    if (th >= meio) return 0;
    const borda = meio * 0.82;
    const suave = th <= borda ? 1 : Math.max(0, 1 - (th - borda) / (meio - borda));
    return (I0 * cosT * cosT * cosT / (h * h)) * suave;
  }

  function assinatura(area) {
    return [area.w, area.h, area.pd, area.lux, area.refl].join(',') + '|' +
      area.items.filter((i) => i.type === 'light')
        .map((l) => [l.x, l.y, l.lumens, l.dim, l.beam, l.base].join('_')).join(';');
  }

  let cache = { sig: null, dados: null };

  /* Iluminância de um conjunto qualquer de luminárias, sem tocar no estado. */
  function simular(area, luzes, passo) {
    const cel = passo || CELULA;
    const amb = indireta(area, luzes);
    const cols = G.clamp(Math.ceil(area.w / cel), 2, MAXC);
    const rows = G.clamp(Math.ceil(area.h / cel), 2, MAXC);
    const grid = new Float32Array(cols * rows);
    let soma = 0, min = Infinity, max = 0;
    for (let j = 0; j < rows; j++) {
      const py = ((j + 0.5) / rows) * area.h;
      for (let i = 0; i < cols; i++) {
        const px = ((i + 0.5) / cols) * area.w;
        let e = amb;
        for (const l of luzes) e += contribui(l, area, px, py);
        grid[j * cols + i] = e;
        soma += e;
        if (e < min) min = e;
        if (e > max) max = e;
      }
    }
    const n = cols * rows;
    const media = n ? soma / n : 0;
    if (!isFinite(min)) min = 0;
    return { grid, cols, rows, media, min, max, amb, u0: media > 0 ? min / media : 0 };
  }

  /* Mapa da luz que bate numa parede (iluminância vertical + parcela refletida). */
  function parede(area, wall, luzes) {
    const L = (wall === 'top' || wall === 'bottom') ? area.w : area.h;
    const cols = G.clamp(Math.round(L / 0.06), 4, MAXC);
    const rows = G.clamp(Math.round(area.pd / 0.06), 4, MAXC);
    const amb = indireta(area, luzes);
    const grid = new Float32Array(cols * rows);
    let soma = 0, min = Infinity, max = 0;
    for (let j = 0; j < rows; j++) {
      const z = ((rows - j - 0.5) / rows) * area.pd;   // linha 0 = topo
      for (let i = 0; i < cols; i++) {
        const p = pontoParede(area, wall, ((i + 0.5) / cols) * L);
        let e = amb;
        for (const l of luzes) e += contribuiParede(l, area, p, z);
        grid[j * cols + i] = e;
        soma += e;
        if (e < min) min = e;
        if (e > max) max = e;
      }
    }
    const n = cols * rows;
    if (!isFinite(min)) min = 0;
    return { grid, cols, rows, media: n ? soma / n : 0, min, max, amb, L };
  }

  /* Imagem falsecolor de um grid, para pintar no canvas. */
  function imagem(grid, cols, rows, alvo) {
    const img = document.createElement('canvas');
    img.width = cols; img.height = rows;
    const ictx = img.getContext('2d');
    const dados = ictx.createImageData(cols, rows);
    for (let k = 0; k < cols * rows; k++) {
      const razao = grid[k] / alvo;
      const c = cor(razao);
      dados.data[k * 4] = c[0];
      dados.data[k * 4 + 1] = c[1];
      dados.data[k * 4 + 2] = c[2];
      dados.data[k * 4 + 3] = Math.round(255 * (0.20 + 0.5 * G.clamp(razao, 0, 1.2)));
    }
    ictx.putImageData(dados, 0, 0);
    return img;
  }

  function calc(area) {
    const sig = assinatura(area);
    if (cache.sig === sig) return cache.dados;

    const luzes = area.items.filter((i) => i.type === 'light');
    const r = simular(area, luzes);
    const { grid, cols, rows, media, min, max } = r;
    const n = cols * rows;

    // imagem do mapa, pintada uma vez por assinatura
    const img = imagem(grid, cols, rows, Math.max(30, area.lux));

    cache = {
      sig,
      dados: { grid, cols, rows, media, min, max, img, luzes: luzes.length, u0: r.u0, amb: r.amb },
    };
    return cache.dados;
  }

  /* Pinta o mapa dentro do piso do cômodo. */
  function pintar(ctx, area, v, X, Y) {
    const m = calc(area);
    if (!m.luzes) return m;
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(0), Y(0), area.w * v.scale, area.h * v.scale);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(m.img, X(0), Y(0), area.w * v.scale, area.h * v.scale);
    ctx.restore();
    return m;
  }

  /* Legenda da escala, em lux. */
  function legenda(ctx, area, W, H, rotulo) {
    const alvo = Math.max(30, area.lux);
    const larg = 132, alt = 10;
    const x = W - larg - 16, y = 78;
    const grad = ctx.createLinearGradient(x, 0, x + larg, 0);
    PARADAS.forEach(([r, c]) => grad.addColorStop(G.clamp(r / 1.6, 0, 1), `rgb(${c[0]},${c[1]},${c[2]})`));
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    App.render.roundRect(ctx, x - 10, y - 20, larg + 20, alt + 40, 10);
    ctx.fill();
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, larg, alt);
    ctx.strokeStyle = 'rgba(40,46,66,.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, larg - 1, alt - 1);
    ctx.fillStyle = '#5b6376';
    ctx.font = '10px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(rotulo || 'luz no plano de trabalho', x, y - 5);
    ctx.textBaseline = 'top';
    ctx.fillText('0', x, y + alt + 4);
    ctx.textAlign = 'center';
    ctx.fillText(alvo + ' lux', x + larg / 1.6, y + alt + 4);
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(alvo * 1.6) + '', x + larg, y + alt + 4);
  }

  return { calc, simular, parede, imagem, indireta, contribui, pintar, legenda, PLANO, fluxo, REFL };
})();
