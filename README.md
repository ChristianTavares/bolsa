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
  guarda-roupa 3 portas 1,50 × 0,60, geladeira, sofá, mesa redonda…), incluindo a mesa de
  trabalho, gaveteiros, monitores 24"/27" e ultrawide 34"/49" na altura da bancada, quadros
  e prateleiras de parede, TV e camas de cachorro do P ao GG.
  Arraste para posicionar, use a alça do canto para redimensionar e a alça de cima para
  girar. O móvel encosta sozinho na parede quando chega perto e a posição fica presa numa
  malha de 5 cm.
- **Formas com a sua medida**: em *Adicionar* dá para inserir um **retângulo** (largura ×
  profundidade), um **quadrado** (um lado só) ou um **círculo** (diâmetro) para simular um
  móvel que não está no catálogo. No painel *Item* o formato pode ser trocado a qualquer
  momento; num círculo, largura diferente da profundidade vira oval, e o botão *Igualar
  medidas* volta ao círculo perfeito.
- **Móveis que abrem**: sofá-cama, poltrona-cama, sofá retrátil e mesa extensível guardam
  dois tamanhos. Toque no móvel já selecionado (ou use o botão *Abrir/Fechar*) e ele estica
  para o tamanho aberto mantendo o encosto parado na parede. Enquanto está selecionado, o
  contorno tracejado mostra o outro tamanho, então dá para ver o espaço que a cama vai
  precisar antes de abrir; se não couber no cômodo, o aviso diz quantos centímetros faltam.
  Qualquer móvel pode virar um móvel de dois tamanhos pelo botão *Definir tamanho aberto*.
- **Linhas**: desenhe linhas dentro do cômodo para dividir ambientes ou medir um vão antes
  de comprar o móvel. A linha mostra o comprimento real em metros, sempre relativo ao
  tamanho definido para o cômodo.
- **Portas e janelas**: entram na parede, com o arco de abertura da porta, e podem ser
  arrastadas ao longo da parede.
- **Desenhar na vista frontal**: com a vista aberta, o que você adiciona entra **encostado
  na parede que está sendo olhada**, já virado para o lado certo. A peça selecionada ganha
  alças — as laterais mudam a medida ao longo da parede, a de cima muda a altura — e o
  desenho cota sozinho a largura, a altura, a distância do chão e o **vão que sobra de cada
  lado** até o vizinho ou até o canto. É assim que se responde "que gaveteiro cabe ao lado
  da mesa" ou "esse ultrawide cabe nessa bancada".
- **Vista frontal**: o mesmo cômodo visto de dentro, olhando para uma parede de cada vez.
  Cada móvel tem *altura* e *base do chão*, então dá para conferir o que fica na parede
  (armário aéreo, TV, ar-condicionado), a altura do peitoril da janela e o que passa na
  frente do quê — as peças mais distantes aparecem esmaecidas. Arrastar na vista anda pela
  parede na horizontal e muda a altura do chão na vertical.
- **Plano de luz em lúmens**: escolha o tipo de ambiente (o lux recomendado vem junto) e
  posicione luminárias separadas em **principal** (plafon, pendente, lustre) e
  **complementar** (spot, downlight, fita, arandela, abajur). O painel soma os lúmens
  instalados, compara com o alvo (área × lux), mostra os lux resultantes e diz quanto falta
  — inclusive um aviso quando a luz principal sozinha não segura o ambiente.
- **Luz que rebate e luz nas paredes**: o cálculo soma a parcela refletida por paredes,
  teto e piso (aproximação da esfera integradora, `E = Φ·ρ / S·(1-ρ)`), escolhida pelo
  acabamento — paredes claras, médias, escuras ou "só luz direta". É a diferença entre o
  papel e a parede: no mesmo quarto, a média sai de 110 para 148 lux e o canto mais escuro
  de 21 para 59. O painel mostra também a **iluminância vertical de cada parede**, e a vista
  frontal pinta a parede com a luz que chega nela — dá para ver o banho de parede do spot.
- **Mapa de onde a luz bate**: a planta é pintada com a iluminância calculada no plano de
  0,75 m, luminária por luminária (`E = I · cos³θ / h²`, com o ângulo sólido do facho), em
  escala falsecolor relativa ao lux do ambiente. O painel mostra a média, o ponto mais
  escuro e a uniformidade — é onde se vê o buraco de sombra entre dois spots.
- **Sugestão de posição dos spots**: escolha o modelo de spot e o site monta várias
  disposições (grades, anel deixando o centro livre, banho de parede), **simula cada uma**
  no mesmo motor do mapa e ordena pelo resultado — atender o lux do ambiente, cobrir o piso,
  gastar menos luminárias. Ele respeita o que já está no teto (o ventilador entra na conta e
  vira zona proibida, para nenhum spot ficar sob as pás), evita spot em cima da cama e diz
  quando os spots são só destaque porque a luz principal já resolve o ambiente. A prévia
  aparece numerada na planta antes de aplicar.
- **Luminária editável**: potência em watts (os lúmens acompanham pela eficiência atual),
  lúmens, dimmer, abertura do facho (24° a 160°), altura de instalação (pendente mais baixo
  ilumina menos área) e temperatura de cor.
- **Marcenaria**: seção separada para desenhar um móvel sob medida de ponta a ponta —
  largura, profundidade, altura, rodapé e espessura da chapa, dividido em módulos de
  prateleiras, gavetas, cabideiro ou nicho, com portas de uma ou duas folhas e, quando
  quiser, um **armário fechado na base** com o resto do módulo aberto em cima (o estilo
  estante + balcão). Há modelos prontos para começar: estante com armário, guarda-roupa de
  3 portas e balcão de TV. Tem vista de
  frente cotada e **3D** que gira com o dedo, e gera o **plano de corte** em milímetros. O
  PNG de exportação junta os três — é o que dá para mandar pro marceneiro orçar.
- **Cotas e escala**: largura e profundidade cotadas fora do desenho, barra de escala e
  malha de 0,5 m / 1 m no fundo.
- **Salvar e exportar**: tudo fica no navegador (localStorage). Dá para exportar/importar o
  projeto em `.json`, salvar a vista atual em `.png`, gerar uma **prancha com todas as
  áreas** em um PNG só e baixar a **lista de áreas em CSV** (medidas, m², pé-direito,
  ambiente, lux alvo, lúmens instalados e contagem de móveis, portas e janelas).
- **Desfazer/refazer** em tudo (botões na barra de cima, `Ctrl/Cmd+Z` e `Ctrl/Cmd+Shift+Z`).

## Como usar

1. Abra o site. Ele já vem com um quarto de exemplo (2,56 × 3,61 m).
2. Em **Áreas**, toque em **+ Nova área** e informe nome, largura, profundidade e a
   espessura da parede. Use as medidas **internas** — de parede a parede, por dentro.
3. Em **Adicionar**, o topo é *Móvel com a medida que você tem* — retângulo, quadrado ou
   círculo, você digita a medida. Abaixo fica o catálogo pronto, por categoria. Nos dois
   casos a peça entra em escala no centro da tela.
4. Arraste o móvel pela planta. A dica no rodapé mostra a medida e o ângulo enquanto você
   move.
5. Use a ferramenta **Linha** para riscar dentro do cômodo: o comprimento aparece em metros.
   **Porta** e **Janela** são adicionadas tocando na parede desejada; na porta, toque de
   novo para virar o lado que abre.
6. Em **Editar** você ajusta tudo por número: as medidas vêm primeiro (largura e
   profundidade em metros), depois posição do centro, rotação, nome e cor. Serve tanto para
   um móvel do catálogo quanto para uma forma que você criou.
7. Para **remover**: o 🗑 no topo da aba *Editar*, o botão *Excluir* no fim dela, o 🗑 na
   lista de itens (aba *Áreas*) ou a tecla `Delete`. Qualquer exclusão volta com o ↶.

Para o plano de luz, abra a aba **Luz**; para a vista frontal, use o seletor
**Planta / Vista frontal** no alto do desenho e as setas para girar entre as quatro paredes.

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

Também existe uma versão em **arquivo único** (CSS e JS embutidos), útil para publicar sem
levar a pasta de assets junto:

```bash
node tools/build-single.js   # gera dist/plantabaixa.html
```

Dentro de um preview embutido (iframe), o navegador bloqueia downloads, então os itens
"Salvar imagem" e "Exportar projeto" ficam escondidos — eles funcionam com o site aberto
em aba própria.

## Estrutura

```
index.html          marcação da interface (barra, painel, canvas, diálogos)
css/styles.css      layout responsivo (sidebar no desktop, bottom sheet no celular)
js/geometry.js      geometria e formatação em metros (pt-BR)
js/presets.js       catálogo de móveis com medidas reais
js/store.js         estado do projeto, localStorage, desfazer/refazer
js/renderer.js      desenho da planta no canvas (paredes, cotas, móveis, portas, luz)
js/elevation.js     desenho da vista frontal (projeção dos móveis numa parede)
js/lightmap.js      cálculo e pintura da iluminância no plano de trabalho
js/sugestao.js      disposições candidatas de spots, simuladas e ordenadas
js/marcenaria.js    móvel sob medida: modelo, vista cotada, 3D e plano de corte
js/exportar.js      prancha das áreas, projeto do móvel e planilha CSV
js/download.js      salvar arquivos (capability do Artifact ou link do navegador)
js/editor.js        vista (zoom/pan), gestos de toque e mouse, edição dos itens
js/ui.js            painéis, formulários, catálogo, menus, importar/exportar
js/app.js           inicialização
tools/build-single.js  gera dist/plantabaixa.html (tudo embutido num arquivo só)
```

Todas as medidas no código são em **metros**; a vista converte metros para pixels com um
único fator de escala (`view.scale`), que é o que garante que móveis e linhas fiquem
sempre proporcionais ao cômodo.
