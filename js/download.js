/* Salvar arquivos: usa a capability do Artifact quando existe e cai no
   link <a download> quando a página está numa aba normal. */
window.App = window.App || {};

App.baixar = (function () {
  let cap;   // undefined = não checado, null = indisponível

  async function capability() {
    if (cap !== undefined) return cap;
    cap = null;
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        cap = await window.claude.use('downloads');
      }
    } catch (e) { cap = null; }
    return cap;
  }

  /* Nome seguro: sem acento, espaço ou caractere que o navegador rejeite. */
  function limpar(nome) {
    return String(nome)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-+/g, '-').replace(/^-|-$/g, '')
      .slice(0, 120) || 'arquivo';
  }

  function porLink(nome, data) {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* Retorna 'salvo' | 'recusado' | 'falhou'. */
  async function baixar(nomeBruto, data) {
    const nome = limpar(nomeBruto);
    const d = await capability();
    if (d) {
      try {
        await d.save({ filename: nome, data });
        return 'salvo';
      } catch (e) {
        if (e && (e.code === 'declined' || e.code === 'rate_limited')) return 'recusado';
        // qualquer outro motivo: tenta o caminho normal do navegador
      }
    }
    try { porLink(nome, data); return 'salvo'; } catch (e) { return 'falhou'; }
  }

  baixar.disponivel = async () => {
    const embutido = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
    if (!embutido) return true;              // aba própria: o link resolve
    return !!(await capability());           // dentro de iframe só com a capability
  };
  return baixar;
})();
