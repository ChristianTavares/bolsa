/* Bootstrap. */
(function () {
  const S = App.Store, E = App.Editor, UI = App.UI;

  S.load();

  E.init({
    canvas: document.getElementById('plan'),
    stage: document.getElementById('stage'),
    onChange: () => {
      UI.render();
      if (E.getSelected()) UI.setTab('props');
    },
    onHint: (msg) => UI.hint(msg),
  });

  UI.init();
  S.subscribe(() => E.draw());
  E.fit();

  // primeira visita: dica rápida
  try {
    if (!localStorage.getItem('plantabaixa.visto')) {
      localStorage.setItem('plantabaixa.visto', '1');
      setTimeout(() => UI.hint('Toque em "Áreas" para criar cômodos com as suas medidas'), 700);
    }
  } catch (e) { /* ignore */ }
})();
