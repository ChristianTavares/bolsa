/* Utilitários de geometria e formatação (todas as medidas em METROS). */
window.App = window.App || {};

App.geo = (function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const snap = (v, step) => Math.round(v / step) * step;
  const d2r = (d) => (d * Math.PI) / 180;
  const r2d = (r) => (r * 180) / Math.PI;

  /* Gira (px,py) em torno de (cx,cy). ang em graus. */
  function rot(px, py, cx, cy, ang) {
    const a = d2r(ang), s = Math.sin(a), c = Math.cos(a);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
  }

  /* Leva um ponto do mundo para o sistema local do item (centro na origem). */
  function toLocal(x, y, item) {
    return rot(x, y, item.x, item.y, -(item.rot || 0));
  }

  function corners(item) {
    const hw = item.w / 2, hh = item.h / 2;
    return [
      [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh],
    ].map(([lx, ly]) => rot(item.x + lx, item.y + ly, item.x, item.y, item.rot || 0));
  }

  function pointInRect(x, y, item, pad) {
    pad = pad || 0;
    const p = toLocal(x, y, item);
    return Math.abs(p.x - item.x) <= item.w / 2 + pad &&
           Math.abs(p.y - item.y) <= item.h / 2 + pad;
  }

  function pointInEllipse(x, y, item, pad) {
    pad = pad || 0;
    const p = toLocal(x, y, item);
    const rx = item.w / 2 + pad, ry = item.h / 2 + pad;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (p.x - item.x) / rx, dy = (p.y - item.y) / ry;
    return dx * dx + dy * dy <= 1;
  }

  /* Ponto dentro do item, respeitando o formato (retângulo ou círculo/oval). */
  function pointInItem(x, y, item, pad) {
    return item.shape === 'circle'
      ? pointInEllipse(x, y, item, pad)
      : pointInRect(x, y, item, pad);
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
    t = clamp(t, 0, 1);
    const qx = x1 + t * dx, qy = y1 + t * dy;
    return Math.hypot(px - qx, py - qy);
  }

  /* Bounding box (em metros) de um item, já rotacionado. */
  function bbox(item) {
    if (item.type === 'line') {
      return {
        x1: Math.min(item.x1, item.x2), y1: Math.min(item.y1, item.y2),
        x2: Math.max(item.x1, item.x2), y2: Math.max(item.y1, item.y2),
      };
    }
    if (item.shape === 'circle') {
      // bbox exata de uma elipse girada
      const a = d2r(item.rot || 0), rx = item.w / 2, ry = item.h / 2;
      const hx = Math.hypot(rx * Math.cos(a), ry * Math.sin(a));
      const hy = Math.hypot(rx * Math.sin(a), ry * Math.cos(a));
      return { x1: item.x - hx, y1: item.y - hy, x2: item.x + hx, y2: item.y + hy };
    }
    const cs = corners(item);
    return {
      x1: Math.min(...cs.map((c) => c.x)), y1: Math.min(...cs.map((c) => c.y)),
      x2: Math.max(...cs.map((c) => c.x)), y2: Math.max(...cs.map((c) => c.y)),
    };
  }

  /* --- formatação pt-BR --- */
  function num(v, casas) {
    casas = casas == null ? 2 : casas;
    return v.toFixed(casas).replace('.', ',');
  }
  const m = (v) => num(v, 2) + ' m';
  const m2 = (v) => num(v, 2) + ' m²';

  /* Aceita "2,56", "2.56", "256" (cm não — sempre metros). */
  function parseNum(str) {
    if (typeof str === 'number') return str;
    const v = parseFloat(String(str).trim().replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  }

  return {
    clamp, snap, d2r, r2d, rot, toLocal, corners,
    pointInRect, pointInEllipse, pointInItem, distToSegment, bbox,
    num, m, m2, parseNum,
  };
})();
