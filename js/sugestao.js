/* Sugestão de posição para os spots.
   Gera disposições candidatas, simula cada uma com o mapa de iluminância e
   ordena pelo resultado: primeiro atender o lux do ambiente, depois
   uniformidade, depois usar menos luminárias. */
window.App = window.App || {};

App.sugestao = (function () {
  const G = App.geo;

  /* Onde não se pode pôr spot: sob as pás do ventilador e coladas nele. */
  function obstaculos(area) {
    return area.items.filter((i) => i.type === 'light' && i.kind === 'principal')
      .map((l) => ({ x: l.x, y: l.y, r: Math.max(0.35, (l.pas || 0) + 0.20) }));
  }

  /* Camas: spot em cima da cama ofusca quem está deitado. */
  function camas(area) {
    return area.items.filter((i) => i.type === 'furniture' && i.altura <= 0.80
      && /cama|colch|sof/i.test(i.name || '')).map((i) => G.bbox(i));
  }

  function livre(p, obs) {
    return obs.every((o) => Math.hypot(p.x - o.x, p.y - o.y) > o.r);
  }

  function sobreCama(p, cs) {
    return cs.some((b) => p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2);
  }

  /* Disposições candidatas para o cômodo. */
  function candidatos(area, recuo) {
    const out = [];
    const rx = G.clamp(recuo, 0.25, Math.max(0.25, area.w / 2 - 0.2));
    const ry = G.clamp(recuo, 0.25, Math.max(0.25, area.h / 2 - 0.2));
    const px = (c, i) => (c === 1 ? area.w / 2 : rx + ((area.w - 2 * rx) * i) / (c - 1));
    const py = (r, j) => (r === 1 ? area.h / 2 : ry + ((area.h - 2 * ry) * j) / (r - 1));

    for (let c = 1; c <= 4; c++) {
      for (let r = 1; r <= 4; r++) {
        if (c * r > 12) continue;
        const pts = [];
        for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) pts.push({ x: px(c, i), y: py(r, j) });
        out.push({ nome: c === 1 && r === 1 ? '1 spot central' : `grade ${c} × ${r}`, pts });
      }
    }

    // anel: só o contorno, deixando o centro para o ventilador
    [[3, 3], [4, 3], [3, 4], [4, 4]].forEach(([c, r]) => {
      const pts = [];
      for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) {
        if (i > 0 && i < c - 1 && j > 0 && j < r - 1) continue;
        pts.push({ x: px(c, i), y: py(r, j) });
      }
      out.push({ nome: `anel ${c} × ${r}`, pts });
    });

    // banho de parede: duas fileiras rentes às paredes mais longas
    const naLargura = area.w >= area.h;
    [2, 3, 4].forEach((n) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        if (naLargura) {
          const x = rx + (area.w - 2 * rx) * t;
          pts.push({ x, y: 0.45 }, { x, y: area.h - 0.45 });
        } else {
          const y = ry + (area.h - 2 * ry) * t;
          pts.push({ x: 0.45, y }, { x: area.w - 0.45, y });
        }
      }
      out.push({ nome: `banho de parede ${n} + ${n}`, pts });
    });

    return out;
  }

  function spotEm(p, modelo, area, uid) {
    return {
      id: uid(), type: 'light', kind: 'spot',
      name: modelo.nome, lumens: modelo.lumens, watts: modelo.watts,
      dim: 100, beam: modelo.beam, k: modelo.k, pas: 0,
      base: modelo.altura > 0 ? modelo.altura : area.pd,
      x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100,
    };
  }

  /* Devolve as melhores opções, já com os spots prontos para inserir. */
  function calcular(area, modelo, opts) {
    opts = opts || {};
    const recuo = opts.recuo == null ? 0.60 : opts.recuo;
    const existentes = area.items.filter((i) => i.type === 'light'
      && (opts.manterSpots ? true : i.kind === 'principal'));
    const obs = obstaculos(area);
    const cs = camas(area);
    const alvo = Math.max(30, area.lux);
    const uid = App.Store.uid;

    // o que já existe, sozinho: mostra se os spots são necessidade ou destaque
    const semSpots = App.lightmap.simular(area, existentes, 0.12);
    let acimaBase = 0;
    for (let k = 0; k < semSpots.grid.length; k++) if (semSpots.grid[k] >= alvo * 0.5) acimaBase++;
    const base = {
      media: semSpots.media,
      cobertura: semSpots.grid.length ? acimaBase / semSpots.grid.length : 0,
      basta: semSpots.media >= alvo && (acimaBase / Math.max(1, semSpots.grid.length)) >= 0.6,
    };

    // cada disposição vale por si e, quando cai sobre a cama, também na versão que desvia
    const lista0 = [];
    candidatos(area, recuo).forEach((cand) => {
      const pts = cand.pts.filter((p) => livre(p, obs));
      if (!pts.length) return;
      lista0.push({ nome: cand.nome, pts });
      const fora = pts.filter((p) => !sobreCama(p, cs));
      if (cs.length && fora.length && fora.length < pts.length) {
        lista0.push({ nome: cand.nome + ', desviando da cama', pts: fora });
      }
    });

    const chaves = new Set();
    const avaliadas = lista0.filter((c) => {
      const k = c.pts.map((p) => p.x.toFixed(2) + ',' + p.y.toFixed(2)).sort().join(';');
      if (chaves.has(k)) return false;
      chaves.add(k);
      return true;
    }).map((cand) => {
      const pts = cand.pts;
      const spots = pts.map((p) => spotEm(p, modelo, area, uid));
      const sim = App.lightmap.simular(area, existentes.concat(spots), 0.12);
      const razao = sim.media / alvo;
      // quanto do piso passa da metade do alvo: mede buraco de sombra melhor que u0
      let acima = 0;
      for (let k = 0; k < sim.grid.length; k++) if (sim.grid[k] >= alvo * 0.5) acima++;
      const cobertura = sim.grid.length ? acima / sim.grid.length : 0;
      const emCama = pts.filter((p) => sobreCama(p, cs)).length;
      let nota = 0;
      nota -= razao < 1 ? (1 - razao) * 120 : (razao - 1) * 22;
      nota += cobertura * 70;
      nota += sim.u0 * 30;
      nota -= spots.length * 2.5;
      nota -= emCama * 40;            // spot no rosto de quem deita é defeito, não detalhe
      return {
        nome: cand.nome, pts, spots, emCama, cobertura,
        media: sim.media, min: sim.min, u0: sim.u0,
        n: spots.length, watts: spots.length * modelo.watts,
        atende: razao >= 0.95 && cobertura >= 0.6, nota,
      };
    }).filter(Boolean);

    avaliadas.sort((a, b) => b.nota - a.nota);
    // tira opções repetidas em número e formato
    const vistas = new Set();
    const lista = avaliadas.filter((o) => {
      const chave = o.n + ':' + o.pts.map((p) => p.y.toFixed(1)).sort().join('_');
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    }).slice(0, 5);
    lista.forEach((o) => { o.base = base; });
    return lista;
  }

  return { calcular, candidatos, obstaculos };
})();
