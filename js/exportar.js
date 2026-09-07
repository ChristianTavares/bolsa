/* Geração dos arquivos que saem do site: prancha das áreas, projeto do
   móvel para o marceneiro, planilha das áreas. */
window.App = window.App || {};

App.exportar = (function () {
  const G = App.geo;

  function salvarCanvas(c, nome, aviso) {
    c.toBlob((blob) => {
      App.baixar(nome, blob).then((r) => {
        if (!aviso) return;
        aviso(r === 'salvo' ? 'Arquivo salvo: ' + nome
          : r === 'recusado' ? 'Download cancelado'
            : 'Não consegui salvar o arquivo');
      });
    }, 'image/png');
  }

  function ctx2d(W, H, dpr) {
    const c = document.createElement('canvas');
    dpr = dpr || 2;
    c.width = W * dpr; c.height = H * dpr;
    const cx = c.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = '#ffffff';
    cx.fillRect(0, 0, W, H);
    return { c, cx };
  }

  function cabecalho(cx, W, titulo, sub) {
    cx.fillStyle = '#1c2030';
    cx.font = '700 22px -apple-system,Segoe UI,Roboto,sans-serif';
    cx.textAlign = 'left'; cx.textBaseline = 'top';
    cx.fillText(titulo, 40, 34);
    cx.fillStyle = '#5b6376';
    cx.font = '13px -apple-system,Segoe UI,Roboto,sans-serif';
    cx.fillText(sub, 40, 64);
    cx.strokeStyle = '#dde1e9';
    cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(40, 90); cx.lineTo(W - 40, 90); cx.stroke();
  }

  /* --------- prancha com todas as áreas --------- */
  function areas(projeto, aviso) {
    const lista = projeto.areas;
    if (!lista.length) return;
    const cols = lista.length <= 2 ? lista.length : lista.length <= 6 ? 3 : 4;
    const rows = Math.ceil(lista.length / cols);
    const esc = 90;                      // px por metro
    const maiorW = Math.max(...lista.map((a) => a.w + 2 * a.wall));
    const maiorH = Math.max(...lista.map((a) => a.h + 2 * a.wall));
    const celW = Math.max(240, maiorW * esc + 110);
    const celH = Math.max(220, maiorH * esc + 130);
    const W = cols * celW + 80;
    const H = rows * celH + 150;
    const { c, cx } = ctx2d(W, H);

    const total = lista.reduce((t, a) => t + a.w * a.h, 0);
    cabecalho(cx, W, projeto.name || 'Planta baixa',
      `${lista.length} área${lista.length > 1 ? 's' : ''} · ${G.m2(total)} no total · desenho em escala real`);

    lista.forEach((a, i) => {
      const gx = 40 + (i % cols) * celW;
      const gy = 120 + Math.floor(i / cols) * celH;
      const s = Math.min((celW - 110) / (a.w + 2 * a.wall), (celH - 130) / (a.h + 2 * a.wall));
      const ox = gx + (celW - a.w * s) / 2;
      const oy = gy + 46 + (celH - 130 - a.h * s) / 2;
      cx.save();
      cx.beginPath();
      cx.rect(gx, gy, celW - 20, celH - 20);
      cx.clip();
      App.render(cx, {
        area: a, width: W, height: H, selectedId: null, exportMode: true,
        mapaLuz: false, legenda: false,
        view: { scale: s, ox, oy },
      });
      cx.restore();
      cx.fillStyle = '#1c2030';
      cx.font = '600 14px -apple-system,Segoe UI,Roboto,sans-serif';
      cx.textAlign = 'left'; cx.textBaseline = 'top';
      cx.fillText(a.name, gx + 8, gy + 6);
      cx.fillStyle = '#5b6376';
      cx.font = '12px -apple-system,Segoe UI,Roboto,sans-serif';
      cx.fillText(`${G.num(a.w)} × ${G.num(a.h)} m · ${G.m2(a.w * a.h)} · pé-direito ${G.m(a.pd)}`, gx + 8, gy + 26);
    });

    salvarCanvas(c, (projeto.name || 'plantas').replace(/\s+/g, '-').toLowerCase() + '-areas.png', aviso);
  }

  /* --------- planilha das áreas --------- */
  function csvAreas(projeto, aviso) {
    const cab = ['Área', 'Largura (m)', 'Profundidade (m)', 'Área (m²)', 'Pé-direito (m)',
      'Parede (cm)', 'Ambiente', 'Lux alvo', 'Lúmens instalados', 'Móveis', 'Portas', 'Janelas'];
    const linhas = projeto.areas.map((a) => {
      const L = App.Store.luz(a);
      const conta = (f) => a.items.filter(f).length;
      return [
        a.name, G.num(a.w), G.num(a.h), G.num(a.w * a.h), G.num(a.pd), G.num(a.wall * 100, 0),
        a.tipo, a.lux, Math.round(L.total),
        conta((i) => i.type === 'furniture'),
        conta((i) => i.type === 'opening' && i.kind === 'porta'),
        conta((i) => i.type === 'opening' && i.kind === 'janela'),
      ];
    });
    const total = projeto.areas.reduce((t, a) => t + a.w * a.h, 0);
    linhas.push(['TOTAL', '', '', G.num(total), '', '', '', '', '', '', '', '']);
    const txt = [cab].concat(linhas)
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    App.baixar((projeto.name || 'areas').replace(/\s+/g, '-').toLowerCase() + '-areas.csv',
      '﻿' + txt).then((r) => {
      if (aviso) aviso(r === 'salvo' ? 'Planilha salva' : r === 'recusado' ? 'Download cancelado' : 'Não consegui salvar');
    });
  }

  /* --------- projeto do móvel para o marceneiro --------- */
  function movel(m, filename, aviso) {
    const M = App.marcenaria;
    const pecas = M.planoDeCorte(m);
    const linhaH = 22;
    const W = 1240;
    const alturaDesenho = 470;
    const H = 150 + alturaDesenho + 60 + (pecas.length + 2) * linhaH + 90;
    const { c, cx } = ctx2d(W, H);

    cabecalho(cx, W, m.nome,
      `${G.num(m.w)} × ${G.num(m.d)} × ${G.num(m.h)} m (largura × profundidade × altura) · `
      + `${m.modulos.length} módulos · chapa ${M.mm(m.esp)} mm`);

    // vista de frente à esquerda
    const meia = (W - 80) / 2;
    const escF = Math.min((meia - 130) / m.w, (alturaDesenho - 120) / m.h);
    cx.save();
    cx.beginPath(); cx.rect(40, 110, meia, alturaDesenho); cx.clip();
    M.desenhaFrente(cx, m, {
      scale: escF,
      ox: 40 + (meia - m.w * escF) / 2,
      oy: 110 + alturaDesenho - 70,
    }, W, H, { exportMode: true });
    cx.restore();

    // 3D à direita
    cx.save();
    cx.beginPath(); cx.rect(40 + meia, 110, meia, alturaDesenho); cx.clip();
    const diag = Math.hypot(m.w, m.h) * 0.85 + m.d * 0.4;
    M.desenha3D(cx, m, {
      scale: Math.min(meia - 120, alturaDesenho - 110) / Math.max(0.5, diag),
      cx: 40 + meia + meia / 2, cy: 110 + alturaDesenho / 2,
      yaw: -0.62, pitch: 0.34,
    }, W, H, { exportMode: true });
    cx.restore();

    // plano de corte
    let y = 110 + alturaDesenho + 40;
    cx.fillStyle = '#1c2030';
    cx.font = '700 15px -apple-system,Segoe UI,Roboto,sans-serif';
    cx.textAlign = 'left'; cx.textBaseline = 'top';
    cx.fillText('Plano de corte', 40, y);
    cx.fillStyle = '#5b6376';
    cx.font = '12px -apple-system,Segoe UI,Roboto,sans-serif';
    cx.fillText(`${G.num(M.areaChapa(pecas))} m² de chapa (sem contar perdas)`, 190, y + 2);
    y += 26;

    const colX = [40, 300, 470, 640, 790];
    cx.fillStyle = '#5b6376';
    cx.font = '600 12px -apple-system,Segoe UI,Roboto,sans-serif';
    ['Peça', 'Largura (mm)', 'Altura (mm)', 'Qtd.', 'Material'].forEach((t, i) => cx.fillText(t, colX[i], y));
    y += 6;
    cx.strokeStyle = '#dde1e9';
    cx.beginPath(); cx.moveTo(40, y + 10); cx.lineTo(W - 40, y + 10); cx.stroke();
    y += 18;

    cx.font = '13px -apple-system,Segoe UI,Roboto,sans-serif';
    pecas.forEach((p, i) => {
      if (i % 2 === 1) {
        cx.fillStyle = '#f6f7fa';
        cx.fillRect(36, y - 4, W - 72, linhaH);
      }
      cx.fillStyle = '#1c2030';
      cx.fillText(p.nome, colX[0], y);
      cx.fillText(String(p.larg), colX[1], y);
      cx.fillText(String(p.alt), colX[2], y);
      cx.fillText(String(p.qtd), colX[3], y);
      cx.fillStyle = '#5b6376';
      cx.fillText(p.mat, colX[4], y);
      y += linhaH;
    });

    if (m.obs) {
      y += 16;
      cx.fillStyle = '#1c2030';
      cx.font = '600 13px -apple-system,Segoe UI,Roboto,sans-serif';
      cx.fillText('Observações', 40, y);
      cx.fillStyle = '#5b6376';
      cx.font = '13px -apple-system,Segoe UI,Roboto,sans-serif';
      cx.fillText(m.obs.slice(0, 160), 130, y);
    }

    salvarCanvas(c, (filename || m.nome.replace(/\s+/g, '-').toLowerCase()) + '.png', aviso);
  }

  return { areas, csvAreas, movel, salvarCanvas };
})();
