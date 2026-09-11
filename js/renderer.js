/* Desenho da planta no canvas 2D. Mundo em metros, tela em pixels CSS. */
window.App = window.App || {};

App.render = (function () {
  const G = App.geo;

  const C = {
    bg: '#eceef2',
    floor: '#fbfbfd',
    wall: '#4a5163',
    wallEdge: '#2f3542',
    gridMinor: '#e4e8f0',
    gridMajor: '#d3d9e6',
    dim: '#8a91a3',
    dimInner: '#9aa2f0',
    brand: '#4c5bd4',
    ink: '#1c2030',
    line: '#3b49c4',
  };

  /* Geometria de uma abertura (porta/janela) na parede. */
  function openingGeom(area, it) {
    const W = area.w, H = area.h, t = area.wall;
    const run = (it.wall === 'top' || it.wall === 'bottom') ? W : H;
    const width = G.clamp(it.width, 0.2, run);
    const pos = G.clamp(it.pos, 0, run - width);
    let o, u, n;
    if (it.wall === 'top')         { o = { x: 0, y: 0 }; u = { x: 1, y: 0 }; n = { x: 0, y: 1 }; }
    else if (it.wall === 'bottom') { o = { x: 0, y: H }; u = { x: 1, y: 0 }; n = { x: 0, y: -1 }; }
    else if (it.wall === 'left')   { o = { x: 0, y: 0 }; u = { x: 0, y: 1 }; n = { x: 1, y: 0 }; }
    else                           { o = { x: W, y: 0 }; u = { x: 0, y: 1 }; n = { x: -1, y: 0 }; }
    const a = { x: o.x + u.x * pos, y: o.y + u.y * pos };
    const b = { x: a.x + u.x * width, y: a.y + u.y * width };
    // retângulo do vão dentro da faixa de parede
    const rect = {
      x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y),
      x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y),
    };
    if (it.wall === 'top')    { rect.y1 = -t; rect.y2 = 0; }
    if (it.wall === 'bottom') { rect.y1 = H;  rect.y2 = H + t; }
    if (it.wall === 'left')   { rect.x1 = -t; rect.x2 = 0; }
    if (it.wall === 'right')  { rect.x1 = W;  rect.x2 = W + t; }
    return { a, b, u, n, rect, width, pos, run };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function pill(ctx, text, sx, sy, color, bg) {
    ctx.font = '600 11px -apple-system,Segoe UI,Roboto,sans-serif';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = bg || 'rgba(255,255,255,.92)';
    roundRect(ctx, sx - w / 2, sy - 9, w, 18, 9);
    ctx.fill();
    ctx.fillStyle = color || C.ink;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, sx, sy + .5);
  }

  /* Cota com setas entre dois pontos de tela. */
  function dimension(ctx, x1, y1, x2, y2, label, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    [[x1, y1, ang], [x2, y2, ang + Math.PI]].forEach(([x, y, a]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a - .35) * 8, y + Math.sin(a - .35) * 8);
      ctx.lineTo(x + Math.cos(a + .35) * 8, y + Math.sin(a + .35) * 8);
      ctx.closePath(); ctx.fill();
    });
    pill(ctx, label, (x1 + x2) / 2, (y1 + y2) / 2, color, 'rgba(236,238,242,.95)');
  }

  function drawGrid(ctx, v, W, H) {
    let step = 1;
    if (v.scale * 0.5 >= 14) step = 0.5;
    if (v.scale * 0.25 >= 22) step = 0.25;
    const x0 = Math.floor((-v.ox / v.scale) / step) * step;
    const x1 = (W - v.ox) / v.scale;
    const y0 = Math.floor((-v.oy / v.scale) / step) * step;
    const y1 = (H - v.oy) / v.scale;
    if ((x1 - x0) / step > 400 || (y1 - y0) / step > 400) return;
    ctx.lineWidth = 1;
    for (let x = x0; x <= x1; x += step) {
      const major = Math.abs(x / 1 - Math.round(x / 1)) < 1e-6;
      ctx.strokeStyle = major ? C.gridMajor : C.gridMinor;
      const sx = Math.round(x * v.scale + v.ox) + .5;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
    }
    for (let y = y0; y <= y1; y += step) {
      const major = Math.abs(y / 1 - Math.round(y / 1)) < 1e-6;
      ctx.strokeStyle = major ? C.gridMajor : C.gridMinor;
      const sy = Math.round(y * v.scale + v.oy) + .5;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    }
  }

  function drawWalls(ctx, area, v, X, Y) {
    const t = area.wall;
    ctx.fillStyle = C.wall;
    ctx.beginPath();
    ctx.rect(X(-t), Y(-t), (area.w + 2 * t) * v.scale, (area.h + 2 * t) * v.scale);
    ctx.rect(X(0), Y(0), area.w * v.scale, area.h * v.scale);
    ctx.fill('evenodd');
    ctx.strokeStyle = C.wallEdge; ctx.lineWidth = 1;
    ctx.strokeRect(X(-t) + .5, Y(-t) + .5, (area.w + 2 * t) * v.scale, (area.h + 2 * t) * v.scale);
  }

  function drawOpening(ctx, area, it, v, X, Y, selected) {
    const g = openingGeom(area, it);
    const sx = X(g.rect.x1), sy = Y(g.rect.y1);
    const sw = (g.rect.x2 - g.rect.x1) * v.scale, sh = (g.rect.y2 - g.rect.y1) * v.scale;
    ctx.fillStyle = C.floor;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = C.wallEdge; ctx.lineWidth = 1;
    ctx.strokeRect(sx + .5, sy + .5, sw - 1, sh - 1);

    if (it.kind === 'janela') {
      ctx.strokeStyle = '#6b8fd6'; ctx.lineWidth = 2;
      const off = { x: g.n.x * area.wall / 2, y: g.n.y * area.wall / 2 };
      ctx.beginPath();
      ctx.moveTo(X(g.a.x + off.x), Y(g.a.y + off.y));
      ctx.lineTo(X(g.b.x + off.x), Y(g.b.y + off.y));
      ctx.stroke();
    } else {
      const hinge = it.flip ? g.b : g.a;
      const dir = it.flip ? { x: -g.u.x, y: -g.u.y } : g.u;
      // n aponta para dentro do cômodo; com "abre para fora" a folha vai para o outro lado
      const giro = it.out ? { x: -g.n.x, y: -g.n.y } : g.n;
      const leaf = { x: hinge.x + dir.x * g.width, y: hinge.y + dir.y * g.width };
      const open = { x: hinge.x + giro.x * g.width, y: hinge.y + giro.y * g.width };
      ctx.strokeStyle = '#8a91a3'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(hinge.x), Y(hinge.y)); ctx.lineTo(X(open.x), Y(open.y)); ctx.stroke();
      const a0 = Math.atan2(leaf.y - hinge.y, leaf.x - hinge.x);
      const a1 = Math.atan2(open.y - hinge.y, open.x - hinge.x);
      let d = a1 - a0;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(X(hinge.x), Y(hinge.y), g.width * v.scale, a0, a1, d < 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (selected) {
      ctx.strokeStyle = C.brand; ctx.lineWidth = 2;
      ctx.strokeRect(sx - 2, sy - 2, sw + 4, sh + 4);
      const mid = { x: (g.a.x + g.b.x) / 2, y: (g.a.y + g.b.y) / 2 };
      pill(ctx, G.m(g.width), X(mid.x + g.n.x * 0.35), Y(mid.y + g.n.y * 0.35), C.brand);
    }
  }

  function drawFurniture(ctx, it, v, X, Y, selected) {
    const sw = it.w * v.scale, sh = it.h * v.scale;
    ctx.save();
    ctx.translate(X(it.x), Y(it.y));
    ctx.rotate(G.d2r(it.rot || 0));
    if (it.shape === 'circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(sw / 2, .5), Math.max(sh / 2, .5), 0, 0, Math.PI * 2);
    } else {
      roundRect(ctx, -sw / 2, -sh / 2, sw, sh, Math.min(6, sw / 6, sh / 6));
    }
    ctx.fillStyle = it.color || '#e2e5ec';
    ctx.fill();
    ctx.strokeStyle = selected ? C.brand : 'rgba(40,46,66,.55)';
    ctx.lineWidth = selected ? 2 : 1.2;
    ctx.stroke();

    // móvel de dois tamanhos: contorno do outro tamanho + linha da dobra
    if (it.alt) {
      const aw = it.alt.w * v.scale, ah = it.alt.h * v.scale;
      ctx.save();
      ctx.setLineDash([6, 4]);
      if (selected) {
        ctx.strokeStyle = 'rgba(76,91,212,.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-aw / 2, -sh / 2, aw, ah);
      }
      if (it.open && it.alt.h < it.h) {
        ctx.strokeStyle = 'rgba(40,46,66,.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sw / 2, -sh / 2 + ah);
        ctx.lineTo(sw / 2, -sh / 2 + ah);
        ctx.stroke();
      }
      ctx.restore();
    }

    // com a peça aberta, o rótulo vai para a parte que esticou
    const dobrado = it.alt && it.open && it.alt.h < it.h;
    if (dobrado) ctx.translate(0, (it.alt.h / 2) * v.scale);

    // rótulo (mantido legível: nunca de cabeça para baixo)
    let a = ((it.rot || 0) % 180 + 180) % 180;
    if (a > 90) a -= 180;
    ctx.rotate(G.d2r(a - (it.rot || 0)));
    const label = it.name || 'Móvel';
    const redondo = it.shape === 'circle';
    let dims = redondo && Math.abs(it.w - it.h) < 1e-6
      ? 'Ø ' + G.num(it.w) + ' m'
      : G.num(it.w) + ' × ' + G.num(it.h) + ' m';
    if (it.alt) dims += it.open ? ' · aberto' : ' · fechado';
    const horiz = Math.abs(Math.cos(G.d2r(a))) > .7;
    let boxW = horiz ? sw : sh;
    let boxH = horiz ? sh : sw;
    if (redondo) { boxW *= 0.72; boxH *= 0.72; }
    if (dobrado) {
      const faixa = (it.h - it.alt.h) * v.scale;
      if (horiz) boxH = Math.min(boxH, faixa); else boxW = Math.min(boxW, faixa);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(28,32,48,.85)';
    if (boxW > 46 && boxH > 26) {
      ctx.font = '600 11px -apple-system,Segoe UI,Roboto,sans-serif';
      ctx.fillText(label, 0, boxH > 40 ? -6 : 0, boxW - 8);
      if (boxH > 40) {
        ctx.font = '10px -apple-system,Segoe UI,Roboto,sans-serif';
        ctx.fillStyle = 'rgba(28,32,48,.55)';
        ctx.fillText(dims, 0, 8, boxW - 8);
      }
    }
    ctx.restore();

    if (selected && it.alt) {
      // etiqueta do outro tamanho, sempre logo à frente da peça
      const d = Math.max(it.h, it.alt.h);
      const borda = G.rot(it.x, it.y - it.h / 2 + d, it.x, it.y, it.rot || 0);
      const frente = G.rot(0, 1, 0, 0, it.rot || 0);
      pill(ctx,
        (it.open ? 'fechado: ' : 'aberto: ') + G.num(it.alt.w) + ' × ' + G.num(it.alt.h) + ' m',
        X(borda.x) + frente.x * 14, Y(borda.y) + frente.y * 14, C.brand);
    }
  }

  function drawLine(ctx, it, v, X, Y, selected) {
    const x1 = X(it.x1), y1 = Y(it.y1), x2 = X(it.x2), y2 = Y(it.y2);
    ctx.strokeStyle = selected ? C.brand : (it.color || C.line);
    ctx.lineWidth = selected ? 3 : 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    [[x1, y1], [x2, y2]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.arc(x, y, selected ? 5 : 3.5, 0, 7); ctx.fill();
    });
    const len = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
    pill(ctx, G.m(len), (x1 + x2) / 2, (y1 + y2) / 2 - 14, C.line);
  }

  /* Raio, em metros, em que a luminária sozinha entrega o lux alvo do ambiente. */
  function raioLuz(it, lux) {
    const fl = it.lumens * ((it.dim == null ? 100 : it.dim) / 100);
    return G.clamp(Math.sqrt(fl / (Math.max(50, lux) * Math.PI)), 0.35, 6);
  }

  function drawGlow(ctx, area, it, v, X, Y) {
    const r = raioLuz(it, area.lux) * v.scale;
    const g = ctx.createRadialGradient(X(it.x), Y(it.y), 0, X(it.x), Y(it.y), r);
    g.addColorStop(0, 'rgba(255,190,50,.20)');
    g.addColorStop(.6, 'rgba(255,190,50,.06)');
    g.addColorStop(1, 'rgba(255,190,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(it.x), Y(it.y), r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLight(ctx, it, v, X, Y, selected) {
    const sx = X(it.x), sy = Y(it.y);
    const principal = it.kind === 'principal';
    const r = principal ? 12 : 7;
    if (principal) {
      ctx.strokeStyle = '#d99b16';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * (r + 3), sy + Math.sin(a) * (r + 3));
        ctx.lineTo(sx + Math.cos(a) * (r + 8), sy + Math.sin(a) * (r + 8));
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = principal ? '#ffd76e' : '#f0b429';
    ctx.fill();
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeStyle = selected ? C.brand : '#a9761a';
    ctx.stroke();
    if (!principal) {
      ctx.beginPath();
      ctx.arc(sx, sy, r - 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (selected) {
      const dim = (it.dim == null ? 100 : it.dim);
      pill(ctx, it.watts + ' W · ' + Math.round(it.lumens * dim / 100) + ' lm'
        + (dim < 100 ? ' · ' + dim + '%' : ''), sx, sy - r - 14, '#8a5c05');
    }
  }

  function drawHandles(ctx, handles) {
    handles.forEach((h) => {
      ctx.beginPath();
      ctx.arc(h.sx, h.sy, h.r || 9, 0, 7);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.brand; ctx.stroke();
      if (h.kind === 'rotate') {
        ctx.fillStyle = C.brand;
        ctx.font = '11px -apple-system,Segoe UI,Roboto,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⟳', h.sx, h.sy + .5);
      }
    });
  }

  function scaleBar(ctx, v, W) {
    const candidates = [0.5, 1, 2, 5, 10];
    let m = candidates.find((c) => c * v.scale >= 60) || 10;
    const px = m * v.scale;
    const x = W - px - 16, y = 22;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + px, y); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
    ctx.moveTo(x + px, y - 5); ctx.lineTo(x + px, y + 5); ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.font = '11px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(G.num(m, m < 1 ? 1 : 0) + ' m', x + px, y + 8);
  }

  /* Alças de manipulação do item selecionado (em coordenadas de tela). */
  function handlesFor(area, it, v, X, Y) {
    if (!it || it.type === 'light') return [];
    if (it.type === 'line') {
      return [
        { kind: 'p1', sx: X(it.x1), sy: Y(it.y1) },
        { kind: 'p2', sx: X(it.x2), sy: Y(it.y2) },
      ];
    }
    if (it.type === 'opening') {
      const g = openingGeom(area, it);
      return [
        { kind: 'o1', sx: X(g.a.x), sy: Y(g.a.y), r: 8 },
        { kind: 'o2', sx: X(g.b.x), sy: Y(g.b.y), r: 8 },
      ];
    }
    const cs = G.corners(it);
    const hs = cs.map((c, i) => ({ kind: 'corner' + i, i, sx: X(c.x), sy: Y(c.y) }));
    // alça de rotação acima do meio do lado superior
    const mid = { x: (cs[0].x + cs[1].x) / 2, y: (cs[0].y + cs[1].y) / 2 };
    const dir = G.rot(0, -1, 0, 0, it.rot || 0);
    hs.push({ kind: 'rotate', sx: X(mid.x) + dir.x * 30, sy: Y(mid.y) + dir.y * 30 });
    return hs;
  }

  function roomLabel(ctx, area, cx, cy) {
    const nome = area.name, med = G.m2(area.w * area.h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 15px -apple-system,Segoe UI,Roboto,sans-serif';
    const w1 = ctx.measureText(nome).width;
    ctx.font = '13px -apple-system,Segoe UI,Roboto,sans-serif';
    const w2 = ctx.measureText(med).width;
    const w = Math.max(w1, w2) + 22;
    ctx.fillStyle = 'rgba(255,255,255,.78)';
    roundRect(ctx, cx - w / 2, cy - 22, w, 44, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(28,32,48,.55)';
    ctx.font = '600 15px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(nome, cx, cy - 9);
    ctx.font = '13px -apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillStyle = 'rgba(28,32,48,.45)';
    ctx.fillText(med, cx, cy + 10);
  }

  function render(ctx, o) {
    const { area, view: v, width: W, height: H } = o;
    const X = (wx) => wx * v.scale + v.ox;
    const Y = (wy) => wy * v.scale + v.oy;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = o.exportMode ? '#ffffff' : C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!area) return [];

    if (!o.exportMode) drawGrid(ctx, v, W, H);

    // piso
    ctx.fillStyle = C.floor;
    ctx.fillRect(X(0), Y(0), area.w * v.scale, area.h * v.scale);

    // onde a luz bate: mapa de iluminância por baixo dos móveis
    const luzes = area.items.filter((i) => i.type === 'light');
    const comMapa = luzes.length && o.mapaLuz !== false;
    if (comMapa) {
      App.lightmap.pintar(ctx, area, v, X, Y);
    } else if (luzes.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(X(0), Y(0), area.w * v.scale, area.h * v.scale);
      ctx.clip();
      luzes.forEach((i) => drawGlow(ctx, area, i, v, X, Y));
      ctx.restore();
    }

    drawWalls(ctx, area, v, X, Y);

    const sel = o.selectedId;
    area.items.filter((i) => i.type === 'furniture')
      .forEach((i) => drawFurniture(ctx, i, v, X, Y, i.id === sel));
    area.items.filter((i) => i.type === 'opening')
      .forEach((i) => drawOpening(ctx, area, i, v, X, Y, i.id === sel));
    area.items.filter((i) => i.type === 'line')
      .forEach((i) => drawLine(ctx, i, v, X, Y, i.id === sel));

    // nome + área do cômodo, sempre legível por cima dos móveis
    roomLabel(ctx, area, X(area.w / 2), Y(area.h / 2));

    // paredes marcadas para papel
    if (area.papel && area.papel.paredes) {
      const faces = {
        top: [[0, 0], [area.w, 0]], bottom: [[0, area.h], [area.w, area.h]],
        left: [[0, 0], [0, area.h]], right: [[area.w, 0], [area.w, area.h]],
      };
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#8a5cd6';
      ctx.lineCap = 'round';
      Object.keys(faces).forEach((w) => {
        if (!area.papel.paredes[w]) return;
        const [p1, p2] = faces[w];
        ctx.beginPath();
        ctx.moveTo(X(p1[0]), Y(p1[1]));
        ctx.lineTo(X(p2[0]), Y(p2[1]));
        ctx.stroke();
      });
      ctx.restore();
    }

    // luminárias por último: são o que se procura no plano de luz
    luzes.forEach((i) => drawLight(ctx, i, v, X, Y, i.id === sel));

    // prévia da sugestão, antes de aplicar
    if (o.previa && o.previa.length) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      o.previa.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,215,110,.55)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#a9761a';
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#7a5405';
        ctx.font = '600 10px -apple-system,Segoe UI,Roboto,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), X(p.x), Y(p.y) + .5);
        ctx.setLineDash([5, 4]);
      });
      ctx.restore();
    }

    // linha sendo desenhada
    if (o.draft) {
      drawLine(ctx, Object.assign({ type: 'line' }, o.draft), v, X, Y, true);
    }

    // cotas internas (largura em cima, profundidade à esquerda)
    const t = area.wall;
    dimension(ctx, X(0), Y(-t) - 26, X(area.w), Y(-t) - 26, G.m(area.w), C.dim);
    dimension(ctx, X(-t) - 26, Y(0), X(-t) - 26, Y(area.h), G.m(area.h), C.dim);

    if (comMapa && o.legenda !== false) App.lightmap.legenda(ctx, area, W, H);

    let handles = [];
    if (!o.exportMode) {
      const selItem = area.items.find((i) => i.id === sel);
      handles = handlesFor(area, selItem, v, X, Y);
      drawHandles(ctx, handles);
      scaleBar(ctx, v, W);
    }
    return handles;
  }

  render.openingGeom = openingGeom;
  render.raioLuz = raioLuz;
  render.pill = pill;
  render.roundRect = roundRect;
  render.dimension = dimension;
  render.C = C;
  render.handlesFor = handlesFor;
  return render;
})();
