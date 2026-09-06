/* Gera dist/plantabaixa.html: arquivo único com CSS e JS embutidos.
   Serve para publicar como Artifact ou hospedar em qualquer lugar sem os assets. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g,
  (_, href) => '<style>\n' + read(href).trim() + '\n</style>');

html = html.replace(/<script src="([^"]+)"><\/script>/g,
  (_, src) => '<script>\n' + read(src).trim() + '\n</script>');

// O Artifact envolve o conteúdo em <!doctype html><head>…</head><body>,
// então a saída carrega só o miolo da página.
html = html
  .replace(/^[\s\S]*?<head>\s*/, '')
  .replace(/\s*<\/head>\s*<body>\s*/, '\n')
  .replace(/\s*<\/body>\s*<\/html>\s*$/, '\n')
  .replace(/^\s*<meta charset="utf-8">\s*$/m, '')
  .replace(/^\s*<meta name="viewport"[^>]*>\s*$/m, '');

const out = path.join(root, 'dist', 'plantabaixa.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html.replace(/\n{3,}/g, '\n\n'));
console.log('gerado', path.relative(root, out), (html.length / 1024).toFixed(1) + ' kB');
