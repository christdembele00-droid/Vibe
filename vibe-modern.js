(() => {
  const $ = (s) => document.querySelector(s);
  const openPalette = () => {
    let modal = $('#vibeCommandPalette');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vibeCommandPalette';
      modal.className = 'vibe-command-palette';
      modal.innerHTML = `<div class="vibe-command-backdrop" data-command-close></div><section class="vibe-command-card" role="dialog" aria-modal="true" aria-label="Recherche VIBE"><div class="vibe-command-head"><i class="fa-solid fa-magnifying-glass"></i><input id="vibeCommandInput" type="text" placeholder="Rechercher dans VIBE…" autocomplete="off"><kbd>ESC</kbd></div><div class="vibe-command-hint">Recherche rapide dans tes discussions</div></section>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target.matches('[data-command-close]')) closePalette(); });
      $('#vibeCommandInput')?.addEventListener('input', e => {
        const search = $('#search');
        if (search) { search.value = e.target.value; search.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    }
    modal.classList.add('open');
    requestAnimationFrame(() => $('#vibeCommandInput')?.focus());
    const search = $('#search');
    if (search) $('#vibeCommandInput').value = search.value || '';
  };
  const closePalette = () => $('#vibeCommandPalette')?.classList.remove('open');
  window.VIBE_COMMAND_PALETTE = { open: openPalette, close: closePalette };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
    if (e.key === 'Escape') closePalette();
  });
  document.addEventListener('click', e => {
    const input = e.target.closest('#search');
    if (input && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openPalette(); }
  });
})();
