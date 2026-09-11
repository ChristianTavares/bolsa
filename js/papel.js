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

  const inteira = (area, w) => ({ de: 0, ate: comprimentoParede(area, w), z0: 0, z1: area.pd });

  /* Área, vãos e líquida do trecho de papel de uma parede.
     O trecho é de..até ao longo da parede (medido do mesmo canto que as
     portas) e z0..z1 de altura. */
  function parede(area, w, t) {
    const L = comprimentoParede(area, w);
    t = t || inteira(area, w);
    const larg = Math.max(0, t.ate - t.de);
    const alt = Math.max(0, t.z1 - t.z0);
    const bruta = larg * alt;
    // só a parte de cada vão que cai dentro do trecho
    const vaos = area.items
      .filter((i) => i.type === 'opening' && i.wall === w)
      .reduce((soma, i) => {
        const dx = Math.max(0, Math.min(t.ate, i.pos + i.width) - Math.max(t.de, i.pos));
        const dz = Math.max(0, Math.min(t.z1, i.base + i.altura) - Math.max(t.z0, i.base));
        return soma + dx * dz;
      }, 0);
    return {
      wall: w, nome: NOMES[w], L, t, larg, alt,
      bruta, vaos, liquida: Math.max(0, bruta - vaos),
      parcial: larg < L - 0.005 || alt < area.pd - 0.005,
    };
  }

  /* Altura de corte de cada pano, já com margem e rapport. */
  function alturaPano(altura, c) {
    const base = altura + (+c.margem || 0);
    if (!(c.rapport > 0)) return base;
    return Math.ceil(base / c.rapport) * c.rapport;
  }

  function calcular(area) {
    const c = conf(area);
    const itens = ORDEM.filter((w) => c.paredes[w]).map((w) => {
      const p = parede(area, w, c.paredes[w]);
      const hp = alturaPano(p.alt, c);
      const porRolo = Math.floor((c.comprimento || 0) / hp);
      const panos = Math.ceil(p.larg / c.largura);
      return Object.assign(p, {
        hp, porRolo, panos,
        rolosSozinha: porRolo > 0 ? Math.ceil(panos / porRolo) : 0,
      });
    });
    // trechos de alturas diferentes não dividem rolo: soma por altura de pano
    const grupos = {};
    itens.forEach((i) => {
      const k = i.hp.toFixed(3);
      grupos[k] = grupos[k] || { hp: i.hp, porRolo: i.porRolo, panos: 0 };
      grupos[k].panos += i.panos;
    });
    const lista = Object.keys(grupos).map((k) => grupos[k]);
    const rolos = lista.reduce((t, g) =>
      t + (g.porRolo > 0 ? Math.ceil(g.panos / g.porRolo) : 0), 0);
    const usado = lista.reduce((t, g) => t + g.panos * g.hp, 0);
    const panos = itens.reduce((t, i) => t + i.panos, 0);
    return {
      c, itens, grupos: lista, panos,
      liquida: itens.reduce((t, i) => t + i.liquida, 0),
      bruta: itens.reduce((t, i) => t + i.bruta, 0),
      rolos,
      rolosPorParede: itens.reduce((t, i) => t + i.rolosSozinha, 0),
      semAltura: lista.some((g) => g.porRolo < 1),
      sobra: Math.max(0, rolos * c.comprimento - usado),
      m2Rolo: c.largura * c.comprimento,
    };
  }

  return { calcular, parede, inteira, alturaPano, conf, padrao, NOMES, ORDEM, comprimentoParede };
})();
