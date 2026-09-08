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
    return [area.w, area.h, area.pd, area.lux].join(',') + '|' +
      area.items.filter((i) => i.type === 'light')
        .map((l) => [l.x, l.y, l.lumens, l.dim, l.beam, l.base].join('_')).join(';');
  }

  let cache = { sig: null, dados: null };

  /* Iluminância de um conjunto qualquer de luminárias, sem tocar no estado. */
  function simular(area, luzes, passo) {
    const cel = passo || CELULA;
    const cols = G.clamp(Math.ceil(area.w / cel), 2, MAXC);
    const rows = G.clamp(Math.ceil(area.h / cel), 2, MAXC);
    const grid = new Float32Array(cols * rows);
    let soma = 0, min = Infinity, max = 0;
    for (let j = 0; j < rows; j++) {
      const py = ((j + 0.5) / rows) * area.h;
      for (let i = 0; i < cols; i++) {
        const px = ((i + 0.5) / cols) * area.w;
        let e = 0;
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
    return { grid, cols, rows, media, min, max, u0: media > 0 ? min / media : 0 };
  }

  function calc(area) {
    const sig = assinatura(area);
    if (cache.sig === sig) return cache.dados;

    const luzes = area.items.filter((i) => i.type === 'light');
    const r = simular(area, luzes);
    const { grid, cols, rows, media, min, max } = r;
    const n = cols * rows;

    // imagem do mapa, pintada uma vez por assinatura
    const alvo = Math.max(30, area.lux);
    const img = document.createElement('canvas');
    img.width = cols; img.height = rows;
    const ictx = img.getContext('2d');
    const dados = ictx.createImageData(cols, rows);
    for (let k = 0; k < n; k++) {
      const razao = grid[k] / alvo;
      const c = cor(razao);
      dados.data[k * 4] = c[0];
      dados.data[k * 4 + 1] = c[1];
      dados.data[k * 4 + 2] = c[2];
      dados.data[k * 4 + 3] = Math.round(255 * (0.20 + 0.5 * G.clamp(razao, 0, 1.2)));
    }
    ictx.putImageData(dados, 0, 0);

    cache = {
      sig,
      dados: { grid, cols, rows, media, min, max, img, luzes: luzes.length, u0: r.u0 },
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
  function legenda(ctx, area, W, H) {
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
    ctx.fillText('luz no plano de trabalho', x, y - 5);
    ctx.textBaseline = 'top';
    ctx.fillText('0', x, y + alt + 4);
    ctx.textAlign = 'center';
    ctx.fillText(alvo + ' lux', x + larg / 1.6, y + alt + 4);
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(alvo * 1.6) + '', x + larg, y + alt + 4);
  }

  return { calc, simular, contribui, pintar, legenda, PLANO, fluxo };
})();
