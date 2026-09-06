/* VIBE 2026 — all action surfaces open in the right workspace */
(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const fallback = 'https://i.pravatar.cc/150?img=12';

  function openRightPanel(html, title = 'VIBE', subtitle = 'Action') {
    const messages = $('messages');
    if (!messages) return;
    document.querySelector('.app')?.classList.add('chat-open', 'right-action-open');
    if ($('name')) $('name').textContent = title;
    if ($('status')) $('status').textContent = subtitle;
    if ($('avatar')) $('avatar').src = $('meAvatar')?.src || fallback;
    if ($('typing')) $('typing').hidden = true;
    if ($('composer')) $('composer').hidden = true;
    messages.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'vibe-right-action-workspace';
    wrap.innerHTML = html;
    messages.appendChild(wrap);
    messages.scrollTop = 0;
  }

  function closeRightPanel() {
    document.querySelector('.app')?.classList.remove('right-action-open');
    if (typeof window.VIBE_CLOSE_ACTION_PANEL === 'function') window.VIBE_CLOSE_ACTION_PANEL();
  }

  function showSettings() {
    const name = $('meName')?.textContent || 'Utilisateur';
    const email = $('auth')?.hidden ? 'Compte VIBE connecté' : '';
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head">
          <div><span class="vibe-kicker">VIBE · CONFIGURATION</span><h2>Paramètres</h2><p>Configure VIBE directement dans l’espace principal.</p></div>
          <button class="vibe-action-close" type="button" data-right-close aria-label="Fermer">×</button>
        </div>
        <div class="vibe-settings-grid">
          <article class="vibe-setting-card">
            <div class="vibe-setting-icon"><i class="fa-solid fa-user"></i></div>
            <div><b>Compte</b><span>${esc(name)}</span><small>${esc(email)}</small></div>
            <button type="button" data-right-profile>Ouvrir</button>
          </article>
          <article class="vibe-setting-card">
            <div class="vibe-setting-icon"><i class="fa-solid fa-palette"></i></div>
            <div><b>Apparence</b><span>Interface bleue et blanche 2026</span><small>Design clair, moderne et sans rétro.</small></div>
            <button type="button" data-right-theme>Configurer</button>
          </article>
          <article class="vibe-setting-card">
            <div class="vibe-setting-icon"><i class="fa-solid fa-shield-halved"></i></div>
            <div><b>Sécurité</b><span>Firebase Authentication</span><small>WebRTC pour les appels P2P.</small></div>
            <button type="button" data-right-security>Voir</button>
          </article>
          <article class="vibe-setting-card">
            <div class="vibe-setting-icon"><i class="fa-solid fa-circle-info"></i></div>
            <div><b>À propos</b><span>VIBE · interface 2026</span><small>Discussions · Chaînes · Appels · VIBE AI</small></div>
            <button type="button" data-right-about>Voir</button>
          </article>
        </div>
      </section>`, 'Paramètres', 'Configuration VIBE');
  }

  function showTheme() {
    const oled = localStorage.getItem('vibe-oled') === '1';
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head"><div><span class="vibe-kicker">APPARENCE</span><h2>Personnaliser VIBE</h2><p>Les réglages visuels restent dans la partie droite.</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div>
        <div class="vibe-theme-card">
          <div><b>Interface VIBE 2026</b><span>Bleu, blanc, espaces nets et composants modernes.</span></div>
          <label class="vibe-switch-row"><span>Mode OLED</span><input id="rightOledToggle" type="checkbox" ${oled ? 'checked' : ''}><i></i></label>
        </div>
      </section>`, 'Apparence', 'Personnalisation');
    $('rightOledToggle')?.addEventListener('change', e => {
      localStorage.setItem('vibe-oled', e.target.checked ? '1' : '0');
      document.documentElement.classList.toggle('vibe-light-preview', !e.target.checked);
    });
  }

  function showNewChat() {
    const contacts = [...document.querySelectorAll('#contacts .contact')];
    const list = contacts.length ? contacts.map((el, i) => {
      const img = el.querySelector('img')?.src || fallback;
      const name = el.querySelector('b')?.textContent || `Contact ${i + 1}`;
      return `<button class="vibe-right-contact" type="button" data-contact-index="${i}"><img src="${esc(img)}" alt=""><span><b>${esc(name)}</b><small>Ouvrir la discussion</small></span><i class="fa-solid fa-chevron-right"></i></button>`;
    }).join('') : `<div class="vibe-action-empty"><i class="fa-solid fa-user-plus"></i><b>Aucune discussion disponible</b><span>Connecte-toi avec d’autres utilisateurs pour commencer une conversation.</span></div>`;
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head"><div><span class="vibe-kicker">MESSAGERIE</span><h2>Nouvelle discussion</h2><p>Choisis un contact. La conversation s’ouvrira ici.</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div>
        <div class="vibe-right-contact-list">${list}</div>
      </section>`, 'Nouvelle discussion', 'Choisir un contact');
    document.querySelectorAll('[data-contact-index]').forEach(btn => btn.addEventListener('click', () => {
      const target = contacts[Number(btn.dataset.contactIndex)];
      target?.click();
    }));
  }

  function showInfo(kind) {
    const data = {
      security: ['SÉCURITÉ', 'Sécurité & P2P', 'Authentification Firebase, stockage Firebase et appels WebRTC sécurisés par le navigateur.'],
      about: ['VIBE', 'À propos de VIBE', 'VIBE est une messagerie moderne avec Discussions, Chaînes, Appels et VIBE AI.']
    }[kind];
    if (!data) return;
    openRightPanel(`<section class="vibe-action-panel"><div class="vibe-action-head"><div><span class="vibe-kicker">${data[0]}</span><h2>${data[1]}</h2><p>${data[2]}</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div><div class="vibe-action-info"><i class="fa-solid fa-check-circle"></i><b>Tout est affiché dans l’espace principal</b><span>La colonne de gauche reste dédiée à la navigation. Les actions et leurs contenus apparaissent à droite.</span></div></section>`, data[1], 'VIBE');
  }

  document.addEventListener('click', e => {
    const target = e.target.closest?.('#railSettings,#theme,#newChat,[data-right-close],[data-right-profile],[data-right-theme],[data-right-security],[data-right-about]');
    if (!target) return;
    if (target.matches('#railSettings,#theme,#newChat')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (target.id === 'newChat') showNewChat();
      else if (target.id === 'theme') showTheme();
      else showSettings();
      return;
    }
    if (target.matches('[data-right-close]')) { e.preventDefault(); closeRightPanel(); return; }
    if (target.matches('[data-right-profile]')) { e.preventDefault(); $('profile')?.click(); return; }
    if (target.matches('[data-right-theme]')) { e.preventDefault(); showTheme(); return; }
    if (target.matches('[data-right-security]')) { e.preventDefault(); showInfo('security'); return; }
    if (target.matches('[data-right-about]')) { e.preventDefault(); showInfo('about'); }
  }, true);
})();
