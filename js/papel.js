/* Papel de parede: metragem por parede e quantos rolos comprar.
   A conta que vale é a de panos (tiras verticais), não m² ÷ área do rolo:
   sobra de rolo que não dá a altura do pé-direito é perda. */
window.App = window.App || {};

App.papel = (function () {
  const G = App.geo;
  const NOMES = { top: 'Superior', right: 'Direita', bottom: 'Inferior', left: 'Esquerda' };
  const ORDEM = ['top', 'right', 'bottom', 'left'];

  const padrao = () => ({
    largura: 0.53, comprimento: 10, rapport: 0, margem: 0.10,
    paredes: { top: false, right: false, bottom: false, left: false },
  });

  const conf = (area) => Object.assign(padrao(), area.papel || {});

  const comprimentoParede = (area, w) => (w === 'top' || w === 'bottom') ? area.w : area.h;

  /* Área cheia, vãos e área líquida de uma parede. */
  function parede(area, w) {
    const L = comprimentoParede(area, w);
    const bruta = L * area.pd;
    const vaos = area.items
      .filter((i) => i.type === 'opening' && i.wall === w)
      .reduce((t, i) => t + i.width * i.altura, 0);
    return { wall: w, nome: NOMES[w], L, bruta, vaos, liquida: Math.max(0, bruta - vaos) };
  }

  /* Altura de corte de cada pano, já com margem e rapport. */
  function alturaPano(area, c) {
    const base = area.pd + (+c.margem || 0);
    if (!(c.rapport > 0)) return base;
    return Math.ceil(base / c.rapport) * c.rapport;
  }

  function calcular(area) {
    const c = conf(area);
    const hp = alturaPano(area, c);
    const porRolo = Math.floor((c.comprimento || 0) / hp);
    const itens = ORDEM.filter((w) => c.paredes[w]).map((w) => {
      const p = parede(area, w);
      const panos = Math.ceil(p.L / c.largura);
      return Object.assign(p, {
        panos,
        rolosSozinha: porRolo > 0 ? Math.ceil(panos / porRolo) : 0,
      });
    });
    const panos = itens.reduce((t, i) => t + i.panos, 0);
    const liquida = itens.reduce((t, i) => t + i.liquida, 0);
    const bruta = itens.reduce((t, i) => t + i.bruta, 0);
    const rolos = porRolo > 0 ? Math.ceil(panos / porRolo) : 0;
    const rolosPorParede = itens.reduce((t, i) => t + i.rolosSozinha, 0);
    const usado = panos * hp;
    const comprado = rolos * c.comprimento;
    return {
      c, itens, hp, porRolo, panos, liquida, bruta, rolos, rolosPorParede,
      sobra: Math.max(0, comprado - usado),
      m2Rolo: c.largura * c.comprimento,
    };
  }

  return { calcular, parede, conf, padrao, NOMES, ORDEM, comprimentoParede };
})();
