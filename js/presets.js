/* Catálogo de móveis com medidas reais (metros). w = largura, h = profundidade. */
window.App = window.App || {};

App.presets = (function () {
  const cores = {
    'Quarto': '#c8d3f5',
    'Sala': '#cfe6d8',
    'Cozinha': '#f7dcc4',
    'Banheiro': '#cfe6ef',
    'Escritório': '#e3d5f2',
    'Geral': '#e2e5ec',
  };

  const itens = [
    // Quarto
    ['Quarto', 'Cama solteiro', 0.88, 1.88],
    ['Quarto', 'Cama solteirão', 0.96, 2.03],
    ['Quarto', 'Cama casal', 1.38, 1.88],
    ['Quarto', 'Cama queen', 1.58, 1.98],
    ['Quarto', 'Cama king', 1.93, 2.03],
    ['Quarto', 'Berço', 0.70, 1.30],
    ['Quarto', 'Criado-mudo', 0.50, 0.40],
    ['Quarto', 'Guarda-roupa 2p', 1.00, 0.55],
    ['Quarto', 'Guarda-roupa 3p', 1.50, 0.60],
    ['Quarto', 'Guarda-roupa 6p', 2.20, 0.60],
    ['Quarto', 'Cômoda', 0.90, 0.45],
    ['Quarto', 'Penteadeira', 0.90, 0.40],
    // Sala
    ['Sala', 'Sofá 2 lugares', 1.60, 0.85],
    ['Sala', 'Sofá 3 lugares', 2.00, 0.90],
    ['Sala', 'Sofá retrátil', 2.20, 1.10],
    ['Sala', 'Poltrona', 0.80, 0.80],
    ['Sala', 'Rack de TV', 1.80, 0.40],
    ['Sala', 'Mesa de centro', 1.00, 0.60],
    ['Sala', 'Estante', 0.80, 0.35],
    ['Sala', 'Mesa jantar 4 lug.', 1.20, 0.80],
    ['Sala', 'Mesa jantar 6 lug.', 1.60, 0.90],
    ['Sala', 'Cadeira', 0.45, 0.45],
    // Cozinha
    ['Cozinha', 'Geladeira', 0.70, 0.70],
    ['Cozinha', 'Fogão 4 bocas', 0.55, 0.60],
    ['Cozinha', 'Fogão 5 bocas', 0.76, 0.65],
    ['Cozinha', 'Bancada / pia', 1.20, 0.60],
    ['Cozinha', 'Armário aéreo', 1.20, 0.35],
    ['Cozinha', 'Micro-ondas', 0.50, 0.40],
    ['Cozinha', 'Máquina de lavar', 0.60, 0.65],
    ['Cozinha', 'Mesa pequena', 0.80, 0.80],
    // Banheiro
    ['Banheiro', 'Vaso sanitário', 0.38, 0.68],
    ['Banheiro', 'Pia / gabinete', 0.60, 0.45],
    ['Banheiro', 'Box', 0.90, 0.90],
    ['Banheiro', 'Banheira', 1.70, 0.75],
    ['Banheiro', 'Tanque', 0.55, 0.50],
    // Escritório
    ['Escritório', 'Escrivaninha', 1.20, 0.60],
    ['Escritório', 'Mesa em L', 1.50, 1.50],
    ['Escritório', 'Cadeira de escritório', 0.60, 0.60],
    ['Escritório', 'Armário baixo', 0.80, 0.40],
    // Geral
    ['Geral', 'Ar-condicionado', 0.90, 0.25],
    ['Geral', 'Espelho', 0.60, 0.10],
    ['Geral', 'Tapete', 2.00, 1.40],
    ['Geral', 'Caixa / volume', 0.50, 0.50],
  ].map(([cat, nome, w, h]) => ({ cat, nome, w, h, cor: cores[cat] }));

  const categorias = ['Todos'].concat([...new Set(itens.map((i) => i.cat))]);

  return { itens, categorias, cores };
})();
