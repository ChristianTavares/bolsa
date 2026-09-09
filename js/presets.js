/* Catálogos com medidas reais.
   Móveis: [categoria, nome, largura, profundidade, altura, base do chão, forma, tamanho aberto]
   Todas as medidas em metros. */
window.App = window.App || {};

App.presets = (function () {
  const cores = {
    'Quarto': '#c8d3f5',
    'Sala': '#cfe6d8',
    'Cozinha': '#f7dcc4',
    'Banheiro': '#cfe6ef',
    'Escritório': '#e3d5f2',
    'Pet': '#f2d9d9',
    'Geral': '#e2e5ec',
  };

  const itens = [
    // Quarto
    ['Quarto', 'Cama solteiro', 0.88, 1.88, 0.50],
    ['Quarto', 'Cama solteirão', 0.96, 2.03, 0.50],
    ['Quarto', 'Cama casal', 1.38, 1.88, 0.50],
    ['Quarto', 'Cama queen', 1.58, 1.98, 0.55],
    ['Quarto', 'Cama king', 1.93, 2.03, 0.55],
    ['Quarto', 'Berço', 0.70, 1.30, 0.95],
    ['Quarto', 'Criado-mudo', 0.50, 0.40, 0.55],
    ['Quarto', 'Guarda-roupa 2p', 1.00, 0.55, 2.20],
    ['Quarto', 'Guarda-roupa 3p', 1.50, 0.60, 2.20],
    ['Quarto', 'Guarda-roupa 6p', 2.20, 0.60, 2.20],
    ['Quarto', 'Cômoda', 0.90, 0.45, 0.85],
    ['Quarto', 'Penteadeira', 0.90, 0.40, 0.78],
    // Sala
    ['Sala', 'Sofá 2 lugares', 1.60, 0.85, 0.85],
    ['Sala', 'Sofá 3 lugares', 2.00, 0.90, 0.85],
    ['Sala', 'Sofá retrátil', 2.20, 1.10, 0.90, 0, 'rect', [2.20, 1.60]],
    ['Sala', 'Sofá-cama 150 cm', 1.50, 1.00, 0.90, 0, 'rect', [1.50, 1.92]],
    ['Sala', 'Sofá-cama 2 lug.', 1.80, 0.90, 0.90, 0, 'rect', [1.80, 1.90]],
    ['Sala', 'Sofá-cama 3 lug.', 2.10, 0.95, 0.90, 0, 'rect', [2.10, 2.00]],
    ['Sala', 'Poltrona-cama', 0.90, 0.90, 0.85, 0, 'rect', [0.90, 1.90]],
    ['Sala', 'Poltrona', 0.80, 0.80, 0.80],
    ['Sala', 'Rack de TV', 1.80, 0.40, 0.50],
    ['Sala', 'TV 55"', 1.24, 0.08, 0.72, 0.95],
    ['Sala', 'Mesa de centro', 1.00, 0.60, 0.40],
    ['Sala', 'Estante', 0.80, 0.35, 1.80],
    ['Sala', 'Estante ripada 94', 0.94, 0.30, 1.92],
    ['Sala', 'Estante alta 1,80 m', 0.90, 0.35, 1.80],
    ['Sala', 'Mesa jantar 4 lug.', 1.20, 0.80, 0.78],
    ['Sala', 'Mesa jantar 6 lug.', 1.60, 0.90, 0.78],
    ['Sala', 'Mesa extensível', 1.20, 0.80, 0.78, 0, 'rect', [1.80, 0.80]],
    ['Sala', 'Mesa redonda 4 lug.', 1.00, 1.00, 0.78, 0, 'circle'],
    ['Sala', 'Mesa redonda 6 lug.', 1.20, 1.20, 0.78, 0, 'circle'],
    ['Sala', 'Mesa lateral redonda', 0.45, 0.45, 0.50, 0, 'circle'],
    ['Sala', 'Puff', 0.55, 0.55, 0.42, 0, 'circle'],
    ['Sala', 'Tapete redondo', 1.50, 1.50, 0.01, 0, 'circle'],
    ['Sala', 'Cadeira', 0.45, 0.45, 0.90],
    // Cozinha
    ['Cozinha', 'Geladeira', 0.70, 0.70, 1.85],
    ['Cozinha', 'Fogão 4 bocas', 0.55, 0.60, 0.90],
    ['Cozinha', 'Fogão 5 bocas', 0.76, 0.65, 0.90],
    ['Cozinha', 'Bancada / pia', 1.20, 0.60, 0.90],
    ['Cozinha', 'Armário aéreo', 1.20, 0.35, 0.70, 1.50],
    ['Cozinha', 'Micro-ondas', 0.50, 0.40, 0.30, 0.90],
    ['Cozinha', 'Máquina de lavar', 0.60, 0.65, 0.95],
    ['Cozinha', 'Mesa pequena', 0.80, 0.80, 0.78],
    ['Cozinha', 'Mesa redonda', 0.90, 0.90, 0.78, 0, 'circle'],
    // Banheiro
    ['Banheiro', 'Vaso sanitário', 0.38, 0.68, 0.78],
    ['Banheiro', 'Pia / gabinete', 0.60, 0.45, 0.85],
    ['Banheiro', 'Box', 0.90, 0.90, 1.90],
    ['Banheiro', 'Banheira', 1.70, 0.75, 0.55],
    ['Banheiro', 'Tanque', 0.55, 0.50, 0.90],
    // Escritório
    ['Escritório', 'Escrivaninha', 1.20, 0.60, 0.75],
    ['Escritório', 'Mesa 1,40 m', 1.40, 0.70, 0.75],
    ['Escritório', 'Mesa 1,80 m', 1.80, 0.75, 0.75],
    ['Escritório', 'Mesa em L', 1.50, 1.50, 0.75],
    ['Escritório', 'Gaveteiro 3 gav.', 0.40, 0.45, 0.55],
    ['Escritório', 'Gaveteiro 4 gav.', 0.45, 0.50, 0.72],
    ['Escritório', 'Gaveteiro alto', 0.45, 0.50, 1.00],
    ['Escritório', 'Cadeira de escritório', 0.60, 0.60, 1.10],
    ['Escritório', 'Cadeira gamer', 0.70, 0.70, 1.28],
    ['Escritório', 'Monitor 24"', 0.545, 0.20, 0.46, 0.75],
    ['Escritório', 'Monitor 27"', 0.61, 0.21, 0.51, 0.75],
    ['Escritório', 'Ultrawide 34"', 0.81, 0.23, 0.52, 0.75],
    ['Escritório', 'Ultrawide 49"', 1.20, 0.25, 0.56, 0.75],
    ['Escritório', 'Notebook 15"', 0.36, 0.25, 0.25, 0.75],
    ['Escritório', 'Teclado', 0.44, 0.14, 0.03, 0.75],
    ['Escritório', 'CPU torre', 0.22, 0.45, 0.45],
    ['Escritório', 'Suporte de monitor', 0.50, 0.20, 0.12, 0.75],
    ['Escritório', 'Armário baixo', 0.80, 0.40, 0.80],
    // Pet
    ['Pet', 'Cama de cachorro P', 0.55, 0.45, 0.15],
    ['Pet', 'Cama de cachorro M', 0.75, 0.55, 0.18],
    ['Pet', 'Cama de cachorro G', 0.95, 0.70, 0.20],
    ['Pet', 'Cama de cachorro GG', 1.15, 0.85, 0.22],
    ['Pet', 'Caixa de transporte', 0.70, 0.50, 0.50],
    ['Pet', 'Comedouro duplo', 0.40, 0.22, 0.12],
    // Geral
    // Geral
    ['Geral', 'Ar-condicionado', 0.90, 0.25, 0.30, 2.10],
    ['Geral', 'Espelho', 0.60, 0.10, 1.20, 0.90],
    ['Geral', 'Quadro médio', 0.60, 0.04, 0.90, 1.00],
    ['Geral', 'Quadro grande', 1.00, 0.04, 0.70, 1.10],
    ['Geral', 'Prateleira de parede', 0.80, 0.25, 0.04, 1.40],
    ['Geral', 'TV 43"', 0.97, 0.07, 0.57, 1.10],
    ['Geral', 'TV 65"', 1.46, 0.08, 0.84, 0.95],
    ['Geral', 'Tapete', 2.00, 1.40, 0.01],
    ['Geral', 'Caixa / volume', 0.50, 0.50, 0.50],
    ['Geral', 'Círculo / volume', 0.60, 0.60, 0.50, 0, 'circle'],
  ].map(([cat, nome, w, h, altura, base, forma, alt]) => ({
    cat, nome, w, h,
    altura: altura || 0.75,
    base: base || 0,
    forma: forma || 'rect',
    alt: alt ? { w: alt[0], h: alt[1] } : null,
    cor: cores[cat],
  }));

  const categorias = ['Todos'].concat([...new Set(itens.map((i) => i.cat))]);

  /* Luminárias: lúmens típicos de produtos de prateleira. */
  const luzes = [
    { kind: 'principal', nome: 'Plafon LED 18 W', lumens: 1600, watts: 18, beam: 120, k: 4000 },
    { kind: 'principal', nome: 'Plafon LED 24 W', lumens: 2200, watts: 24, beam: 120, k: 4000 },
    { kind: 'principal', nome: 'Plafon LED 36 W', lumens: 3200, watts: 36, beam: 120, k: 4000 },
    { kind: 'principal', nome: 'Pendente LED 12 W', lumens: 1100, watts: 12, beam: 90, k: 3000, altura: 1.90 },
    { kind: 'principal', nome: 'Lustre 5 × E27', lumens: 3000, watts: 45, beam: 120, k: 2700, altura: 2.20 },
    { kind: 'principal', nome: 'Ventilador 2 lâmpadas', lumens: 1600, watts: 18, beam: 120, k: 3000, altura: 2.30, pas: 0.65 },
    { kind: 'principal', nome: 'Ventilador 3 lâmpadas', lumens: 2400, watts: 27, beam: 120, k: 3000, altura: 2.30, pas: 0.65 },
    { kind: 'spot', nome: 'Spot 7 W · 34° 2700K IRC90', lumens: 440, watts: 7, beam: 34, k: 2700 },
    { kind: 'spot', nome: 'Spot LED 7 W (IRC80)', lumens: 600, watts: 7, beam: 38, k: 3000 },
    { kind: 'spot', nome: 'Spot fechado 7 W', lumens: 600, watts: 7, beam: 24, k: 3000 },
    { kind: 'spot', nome: 'Downlight 12 W', lumens: 1050, watts: 12, beam: 60, k: 4000 },
    { kind: 'spot', nome: 'Downlight 18 W', lumens: 1600, watts: 18, beam: 60, k: 4000 },
    { kind: 'spot', nome: 'Fita LED 5 m', lumens: 1500, watts: 24, beam: 120, k: 3000, altura: 2.40 },
    { kind: 'spot', nome: 'Arandela 6 W', lumens: 450, watts: 6, beam: 90, k: 2700, altura: 1.80 },
    { kind: 'spot', nome: 'Abajur 8 W', lumens: 700, watts: 8, beam: 120, k: 2700, altura: 1.40 },
    { kind: 'spot', nome: 'Luminária de piso 15 W', lumens: 1300, watts: 15, beam: 90, k: 3000, altura: 1.60 },
  ];

  /* Lux recomendado por ambiente (referência ABNT NBR ISO/CIE 8995-1). */
  const ambientes = [
    { nome: 'Sala de estar', lux: 150 },
    { nome: 'Sala de jantar', lux: 200 },
    { nome: 'Quarto', lux: 100 },
    { nome: 'Cozinha', lux: 300 },
    { nome: 'Banheiro', lux: 200 },
    { nome: 'Escritório / estudo', lux: 400 },
    { nome: 'Área de serviço', lux: 200 },
    { nome: 'Corredor / hall', lux: 100 },
  ];

  return { itens, categorias, cores, luzes, ambientes };
})();
