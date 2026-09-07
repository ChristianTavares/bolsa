/* Vista frontal (elevação): o cômodo visto de dentro, olhando para uma parede.
   Eixo horizontal = posição ao longo da parede (s); eixo vertical = altura (z). */
window.App = window.App || {};

App.elev = (function () {
  const G = App.geo;

  const NOMES = { top: 'superior', right: 'direita', bottom: 'inferior', left: 'esquerda' };
  const ORDEM = ['top', 'right', 'bottom', 'left'];

  /* Comprimento da parede vista. */
  const run = (area, wall) => (wall === 'top' || wall === 'bottom') ? area.w : area.h;

  /* Ponto do plano -> (s ao longo da parede, d distância até a parede). */
  function sPoint(area, wall, x, y) {
    if (wall === 'top') return { s: x, d: y };
    if (wall === 'bottom') return { s: area.w - x, d: area.h - y };
    if (wall === 'left') return { s: area.h - y, d: x };
    return { s: y, d: area.w - x };
  }

  /* Caixa do plano -> faixa [s1,s2] na vista e distância até a parede. */
  function sRange(area, wall, b) {
    if (wall === 'top') return { s1: b.x1, s2: b.x2, d: b.y1 };
    if (wall === 'bottom') return { s1: area.w - b.x2, s2: area.w - b.x1, d: area.h - b.y2 };
    if (wall === 'left') return { s1: area.h - b.y2, s2: area.h - b.y1, d: b.x1 };
    return { s1: b.y1, s2: b.y2, d: area.w - b.x2 };
  }

  /* Deslocamento horizontal na vista -> deslocamento no plano. */
  function moveBy(wall, ds) {
    if (wall === 'top') return { dx: ds, dy: 0 };
    if (wall === 'bottom') return { dx: -ds, dy: 0 };
    if (wall === 'left') return { dx: 0, dy: -ds };
    return { dx: 0, dy: ds };
  }

  /* O que aparece na vista, do fundo para a frente. */
  function pecas(area, wall) {
    const out = [];
    area.items.forEach((it) => {
      if (it.type === 'furniture') {
        const r = sRange(area, wall, G.bbox(it));
        out.push({ it, s1: r.s1, s2: r.s2, d: Math.max(0, r.d), z1: it.base, z2: it.base + it.altura });
      } else if (it.type === 'light') {
        const p = sPoint(area, wall, it.x, it.y);
        out.push({ it, s1: p.s - 0.12, s2: p.s + 0.12, d: Math.max(0, p.d), z1: area.pd - 0.1, z2: area.pd, luz: true });
      }
    });
    return out.sort((a, b) => b.d - a.d);
  }

  /* Portas e janelas da parede que está sendo vista. */
  function vaos(area, wall) {
    return area.items.filter((i) => i.type === 'opening' && i.wall === wall).map((it) => {
      const g = App.render.openingGeom(area, it);
      const p1 = sPoint(area, wall, g.a.x, g.a.y);
      const p2 = sPoint(area, wall, g.b.x, g.b.y);
      return { it, s1: Math.min(p1.s, p2.s), s2: Math.max(p1.s, p2.s), z1: it.base, z2: it.base + it.altura };
    });
  }

  function render(ctx, o) {
    const { area, wall, view: v, width: W, height: H } = o;
    const C = App.render.C;
    const pill = App.render.pill;
    const dimension = App.render.dimension;
    const X = (s) => s * v.scale + v.ox;
    const Y = (z) => v.oy - z * v.scale;
    const L = run(area, wall), PD = area.pd;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = o.exportMode ? '#ffffff' : C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!area) return;

    // parede vista de frente
    ctx.fillStyle = '#eef0f6';
    ctx.fillRect(X(0), Y(PD), L * v.scale, PD * v.scale);

    // malha de altura a cada 0,5 m
    ctx.lineWidth = 1;
    for (let z = 0.5; z < PD; z += 0.5) {
      const inteiro = Math.abs(z - Math.round(z)) < 1e-6;
      ctx.strokeStyle = inteiro ? '#d7dbe6' : '#e6e9f1';
      ctx.beginPath();
      ctx.moveTo(X(0), Math.round(Y(z)) + .5);
      ctx.lineTo(X(L), Math.round(Y(z)) + .5);
      ctx.stroke();
      if (inteiro) {
        // fora da parede, para não brigar com os móveis
        ctx.fillStyle = '#a7aebe';
        ctx.font = '10px -apple-system,Segoe UI,Roboto,sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(G.num(z, 1) + ' m', X(L) + 7, Y(z));
      }
    }

    // vãos da parede
    vaos(area, wall).forEach((p) => {
      const x = X(p.s1), y = Y(p.z2);
      const w = (p.s2 - p.s1) * v.scale, h = (p.z2 - p.z1) * v.scale;
      ctx.fillStyle = p.it.kind === 'janela' ? '#dbe9f7' : '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = p.it.id === o.selectedId ? C.brand : '#8a91a3';
      ctx.lineWidth = p.it.id === o.selectedId ? 2.5 : 1.5;
      ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
      if (p.it.kind === 'janela') {
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
        ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
        ctx.lineWidth = 1; ctx.strokeStyle = '#8aa8c9';
        ctx.stroke();
      }
      if (w > 46 && h > 22) {
        ctx.fillStyle = 'rgba(28,32,48,.55)';
        ctx.font = '11px -apple-system,Segoe UI,Roboto,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((p.it.kind === 'porta' ? 'Porta ' : 'Janela ') + G.num(p.z2 - p.z1) + ' m',
          x + w / 2, y + h / 2, w - 8);
      }
    });

    // móveis, do fundo para a frente
    const fundo = Math.max(0.001, (wall === 'top' || wall === 'bottom') ? area.h : area.w);
    pecas(area, wall).forEach((p) => {
      const sel = p.it.id === o.selectedId;
      const x = X(p.s1), y = Y(p.z2);
      const w = (p.s2 - p.s1) * v.scale, h = Math.max(2, (p.z2 - p.z1) * v.scale);
      ctx.save();
      ctx.globalAlpha = G.clamp(1 - (p.d / fundo) * .55, .42, 1);
      if (p.luz) {
        ctx.globalAlpha = Math.max(.5, ctx.globalAlpha);
        ctx.beginPath();
        ctx.arc(x + w / 2, Y(area.pd) + 7, p.it.kind === 'principal' ? 9 : 6, 0, Math.PI * 2);
        ctx.fillStyle = p.it.kind === 'principal' ? '#ffd76e' : '#f0b429';
        ctx.fill();
        ctx.strokeStyle = sel ? C.brand : '#a9761a';
        ctx.lineWidth = sel ? 3 : 1.5;
        ctx.stroke();
        ctx.restore();
        return;
      }
      App.render.roundRect(ctx, x, y, w, h, Math.min(5, w / 6, h / 6));
      ctx.fillStyle = p.it.color || '#e2e5ec';
      ctx.fill();
      ctx.strokeStyle = sel ? C.brand : 'rgba(40,46,66,.55)';
      ctx.lineWidth = sel ? 2.5 : 1.2;
      ctx.stroke();
      if (w > 52 && h > 24) {
        ctx.fillStyle = 'rgba(28,32,48,.85)';
        ctx.font = '600 11px -apple-system,Segoe UI,Roboto,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.it.name || 'Móvel', x + w / 2, y + h / 2 - (h > 40 ? 7 : 0), w - 8);
        if (h > 40) {
          ctx.font = '10px -apple-system,Segoe UI,Roboto,sans-serif';
          ctx.fillStyle = 'rgba(28,32,48,.55)';
          ctx.fillText('alt. ' + G.num(p.it.altura) + ' m'
            + (p.it.base > 0 ? ' · a ' + G.num(p.it.base) + ' m do chão' : ''),
            x + w / 2, y + h / 2 + 8, w - 8);
        }
      }
      ctx.restore();
      if (sel) {
        pill(ctx, 'altura ' + G.num(p.it.altura) + ' m · base ' + G.num(p.it.base) + ' m',
          x + w / 2, y - 14, C.brand);
      }
    });

    // piso, teto e cotas
    ctx.strokeStyle = C.wallEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X(-0.15), Y(0)); ctx.lineTo(X(L + 0.15), Y(0));
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(PD)); ctx.lineTo(X(L), Y(PD));
    ctx.stroke();
    ctx.fillStyle = '#dfe3ec';
    ctx.fillRect(X(-0.15), Y(0) + 2, (L + 0.3) * v.scale, 10);

    dimension(ctx, X(0), Y(0) + 34, X(L), Y(0) + 34, G.m(L), C.dim);
    dimension(ctx, X(0) - 30, Y(0), X(0) - 30, Y(PD), G.m(PD), C.dim);

    ctx.fillStyle = 'rgba(28,32,48,.45)';
    ctx.font = '600 13px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('Parede ' + NOMES[wall] + ' · ' + area.name, X(L / 2), Y(PD) - 14);
  }

  return { render, run, sPoint, sRange, moveBy, pecas, vaos, NOMES, ORDEM };
})();
