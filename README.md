# PlantaBaixa

Site para planejar a planta baixa de um apartamento **separado por áreas** (quarto, sala,
cozinha…). Você informa as medidas reais de cada cômodo, o site desenha o ambiente vazio
em escala e tudo que for colocado dentro — móveis, linhas, portas e janelas — respeita
essa mesma escala.

Funciona no **celular** (toque, arrastar, pinça para zoom) e no **desktop**
(mouse, roda do mouse, teclado). É um site estático: só HTML, CSS e JavaScript, sem build
e sem servidor.

## O que dá para fazer

- **Áreas**: criar quantos cômodos quiser informando largura × profundidade em metros
  (medidas internas) e a espessura da parede. O site mostra a área em m² de cada ambiente
  e o total do apartamento.
- **Móveis em escala**: catálogo com medidas reais de mercado (cama casal 1,38 × 1,88,
  guarda-roupa 3 portas 1,50 × 0,60, geladeira, sofá, fogão…) ou móvel com medida própria.
  Arraste para posicionar, use a alça do canto para redimensionar e a alça de cima para
  girar. O móvel encosta sozinho na parede quando chega perto e a posição fica presa numa
  malha de 5 cm.
- **Linhas**: desenhe linhas dentro do cômodo para dividir ambientes ou medir um vão antes
  de comprar o móvel. A linha mostra o comprimento real em metros, sempre relativo ao
  tamanho definido para o cômodo.
- **Portas e janelas**: entram na parede, com o arco de abertura da porta, e podem ser
  arrastadas ao longo da parede.
- **Cotas e escala**: largura e profundidade cotadas fora do desenho, barra de escala e
  malha de 0,5 m / 1 m no fundo.
- **Salvar**: tudo fica no navegador (localStorage). Dá para exportar/importar o projeto
  em `.json` e salvar a planta do cômodo em `.png`.
- **Desfazer/refazer** em tudo (botões na barra de cima, `Ctrl/Cmd+Z` e `Ctrl/Cmd+Shift+Z`).

## Como usar

1. Abra o site. Ele já vem com um quarto de exemplo (2,56 × 3,61 m).
2. Em **Áreas**, toque em **+ Nova área** e informe nome, largura, profundidade e a
   espessura da parede. Use as medidas **internas** — de parede a parede, por dentro.
3. Em **Adicionar**, escolha um móvel do catálogo (ou crie um com a medida que você tem).
   Ele entra em escala no centro da tela.
4. Arraste o móvel pela planta. A dica no rodapé mostra a medida e o ângulo enquanto você
   move.
5. Use a ferramenta **Linha** para riscar dentro do cômodo: o comprimento aparece em metros.
   **Porta** e **Janela** são adicionadas tocando na parede desejada.
6. Em **Item** você ajusta tudo por número: medidas, posição do centro, rotação, cor.

Atalhos no desktop: `Delete` apaga o item selecionado, setas movem 5 cm (com `Shift`, 1 cm),
`Esc` cancela a ferramenta atual, roda do mouse dá zoom, arrastar no vazio move a planta.

## Rodando localmente

Não precisa de build. Basta abrir o `index.html` no navegador, ou servir a pasta:

```bash
npx http-server -p 8080 .
# depois acesse http://localhost:8080
```

## Publicando

Como é um site estático na raiz do repositório, dá para publicar direto no GitHub Pages
(Settings → Pages → Deploy from a branch → `/` root) ou em qualquer hospedagem estática
(Netlify, Vercel, S3…).

## Estrutura

```
index.html          marcação da interface (barra, painel, canvas, diálogos)
css/styles.css      layout responsivo (sidebar no desktop, bottom sheet no celular)
js/geometry.js      geometria e formatação em metros (pt-BR)
js/presets.js       catálogo de móveis com medidas reais
js/store.js         estado do projeto, localStorage, desfazer/refazer
js/renderer.js      desenho da planta no canvas (paredes, cotas, móveis, portas)
js/editor.js        vista (zoom/pan), gestos de toque e mouse, edição dos itens
js/ui.js            painéis, formulários, catálogo, menus, importar/exportar
js/app.js           inicialização
```

Todas as medidas no código são em **metros**; a vista converte metros para pixels com um
único fator de escala (`view.scale`), que é o que garante que móveis e linhas fiquem
sempre proporcionais ao cômodo.
