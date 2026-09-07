/* Bootstrap. */
(function () {
  const S = App.Store, E = App.Editor, UI = App.UI;
  let ultimoSel = null;

  S.load();

  E.init({
    canvas: document.getElementById('plan'),
    stage: document.getElementById('stage'),
    onChange: () => {
      UI.render();
      // só puxa para o editor quando a seleção muda de verdade; montando o
      // conjunto de luz, fica na aba Luz
      const sel = E.getSelected();
      const id = sel ? sel.id : null;
      if (id && id !== ultimoSel && !(sel.type === 'light' && UI.activeTab() === 'luz')) {
        UI.setTab('props');
      }
      ultimoSel = id;
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
