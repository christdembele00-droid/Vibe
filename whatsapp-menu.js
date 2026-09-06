const menuButton = document.getElementById('menuBtn');

function closeMenu() {
  document.getElementById('vibeQuickMenu')?.remove();
}

function openMenu() {
  closeMenu();
  const menu = document.createElement('div');
  menu.id = 'vibeQuickMenu';
  menu.className = 'vibe-quick-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button type="button" data-action="new" role="menuitem"><span>＋</span><strong>Nouvelle discussion</strong></button>
    <button type="button" data-action="group" role="menuitem"><span>👥</span><strong>Nouveau groupe</strong></button>
    <button type="button" data-action="search" role="menuitem"><span>⌕</span><strong>Rechercher</strong></button>
    <button type="button" data-action="calls" role="menuitem"><span>☎</span><strong>Appels</strong></button>
    <button type="button" data-action="profile" role="menuitem"><span>◯</span><strong>Profil</strong></button>
    <div class="vibe-menu-divider"></div>
    <button type="button" data-action="settings" role="menuitem"><span>⚙</span><strong>Paramètres</strong></button>
  `;
  document.body.appendChild(menu);
  requestAnimationFrame(() => menu.classList.add('show'));
  menu.addEventListener('click', event => {
    const item = event.target.closest('[data-action]');
    if (!item) return;
    const action = item.dataset.action;
    closeMenu();
    if (action === 'new') document.getElementById('newChatBtn')?.click();
    if (action === 'group') {
      document.getElementById('newChatBtn')?.click();
      setTimeout(() => {
        const choice = prompt('Créer :\n1 = Discussion\n2 = Groupe\n3 = Chaîne', '2');
        if (choice === '2') document.getElementById('newChatBtn')?.click();
      }, 0);
    }
    if (action === 'search') { const input = document.getElementById('searchInput'); input?.focus(); input?.select(); }
    if (action === 'calls') document.querySelector('.tab[data-view="calls"]')?.click();
    if (action === 'profile') document.getElementById('profileBtn')?.click();
    if (action === 'settings') window.VibeSettings?.openSettings();
  });
}

if (menuButton) {
  menuButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openMenu();
  }, true);
}

document.addEventListener('click', event => {
  const menu = document.getElementById('vibeQuickMenu');
  if (menu && !menu.contains(event.target) && event.target !== menuButton) closeMenu();
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
