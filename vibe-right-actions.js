/* VIBE 2026 — action workspace: every secondary action stays in the right/main area */
(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const fallback = 'https://i.pravatar.cc/150?img=12';
  let activePanel = false;

  function openRightPanel(html, title = 'VIBE', subtitle = 'Action') {
    const messages = $('messages');
    if (!messages) return;
    activePanel = true;
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
    activePanel = false;
    document.querySelector('.app')?.classList.remove('right-action-open');
    if (typeof window.VIBE_CLOSE_ACTION_PANEL === 'function') {
      window.VIBE_CLOSE_ACTION_PANEL();
      return;
    }
    const messages = $('messages');
    if (messages) {
      messages.innerHTML = '<div class="welcome"><b>V</b><h2>VIBE</h2><p>Sélectionne une discussion ou une chaîne pour commencer.</p><div class="welcome-features"><span>Temps réel</span><span>Sécurisé</span><span>VIBE AI</span></div></div>';
    }
    if ($('name')) $('name').textContent = 'VIBE';
    if ($('status')) $('status').textContent = 'Messagerie intelligente';
    if ($('composer')) $('composer').hidden = true;
  }

  function showSettings() {
    const name = $('meName')?.textContent || 'Utilisateur';
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head">
          <div><span class="vibe-kicker">VIBE · CONFIGURATION</span><h2>Paramètres</h2><p>Toutes les configurations de VIBE sont réunies dans cet espace.</p></div>
          <button class="vibe-action-close" type="button" data-right-close aria-label="Fermer">×</button>
        </div>
        <div class="vibe-settings-grid">
          <article class="vibe-setting-card"><div class="vibe-setting-icon"><i class="fa-solid fa-user"></i></div><div><b>Compte</b><span>${esc(name)}</span><small>Profil, nom et informations du compte</small></div><button type="button" data-right-profile>Ouvrir</button></article>
          <article class="vibe-setting-card"><div class="vibe-setting-icon"><i class="fa-solid fa-palette"></i></div><div><b>Apparence</b><span>VIBE 2026</span><small>Bleu, blanc, lisibilité et mode OLED</small></div><button type="button" data-right-theme>Configurer</button></article>
          <article class="vibe-setting-card"><div class="vibe-setting-icon"><i class="fa-solid fa-shield-halved"></i></div><div><b>Sécurité</b><span>Firebase + WebRTC</span><small>Authentification, données et appels P2P</small></div><button type="button" data-right-security>Voir</button></article>
          <article class="vibe-setting-card"><div class="vibe-setting-icon"><i class="fa-solid fa-circle-info"></i></div><div><b>À propos</b><span>VIBE · édition 2026</span><small>Discussions · Chaînes · Appels · VIBE AI</small></div><button type="button" data-right-about>Voir</button></article>
        </div>
      </section>`, 'Paramètres', 'Configuration VIBE');
  }

  function showTheme() {
    const oled = localStorage.getItem('vibe-oled') === '1';
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head"><div><span class="vibe-kicker">APPARENCE · 2026</span><h2>Personnaliser VIBE</h2><p>Une interface claire, bleue et blanche, pensée pour les écrans actuels.</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div>
        <div class="vibe-theme-preview"><div class="vibe-theme-preview-top"><span class="vibe-theme-dot"></span><b>VIBE</b><span>Interface 2026</span></div><div class="vibe-theme-preview-body"><div class="vibe-preview-sidebar"></div><div class="vibe-preview-content"><i class="fa-solid fa-wand-magic-sparkles"></i><b>Design moderne</b><span>Hiérarchie claire · espaces nets · animations discrètes</span></div></div></div>
        <div class="vibe-theme-card">
          <div><b>Mode OLED</b><span>Active une apparence sombre à contraste élevé.</span></div>
          <label class="vibe-switch-row"><span>Utiliser le mode OLED</span><input id="rightOledToggle" type="checkbox" ${oled ? 'checked' : ''}><i></i></label>
        </div>
      </section>`, 'Apparence', 'Personnalisation VIBE');
    $('rightOledToggle')?.addEventListener('change', e => {
      localStorage.setItem('vibe-oled', e.target.checked ? '1' : '0');
      document.documentElement.classList.toggle('vibe-light-preview', !e.target.checked);
    });
  }

  function showProfile() {
    const name = $('meName')?.textContent || 'Utilisateur';
    const avatar = $('meAvatar')?.src || fallback;
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head"><div><span class="vibe-kicker">MON COMPTE</span><h2>Mon profil</h2><p>Gère ton identité VIBE depuis l’espace principal.</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div>
        <div class="vibe-profile-modern"><img src="${esc(avatar)}" alt="Photo de profil"><div><span>Compte VIBE</span><h3>${esc(name)}</h3><small>Profil connecté</small></div></div>
        <div class="vibe-action-info"><i class="fa-solid fa-user-check"></i><b>Profil actif</b><span>Ton profil est disponible dans VIBE. Les réglages du compte sont accessibles ici, sans fenêtre centrale.</span></div>
      </section>`, 'Mon profil', 'Compte VIBE');
  }

  function showCommunities() {
    openRightPanel(`
      <section class="vibe-action-panel">
        <div class="vibe-action-head"><div><span class="vibe-kicker">VIBE · ESPACES</span><h2>Communautés</h2><p>Retrouve les espaces communautaires dans la zone de travail principale.</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div>
        <div class="vibe-community-grid"><article><i class="fa-solid fa-users"></i><b>Communautés VIBE</b><span>Espaces de discussion organisés autour de centres d’intérêt.</span></article><article><i class="fa-solid fa-shield-halved"></i><b>Organisation claire</b><span>Les conversations restent séparées des actions et de la navigation.</span></article></div>
      </section>`, 'Communautés', 'Espaces VIBE');
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
        <div class="vibe-action-head"><div><span class="vibe-kicker">MESSAGERIE</span><h2>Nouvelle discussion</h2><p>Choisis un contact. La conversation s’ouvrira ensuite dans cette même zone.</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div>
        <div class="vibe-right-contact-list">${list}</div>
      </section>`, 'Nouvelle discussion', 'Choisir un contact');
    document.querySelectorAll('[data-contact-index]').forEach(btn => btn.addEventListener('click', () => document.querySelectorAll('#contacts .contact')[Number(btn.dataset.contactIndex)]?.click()));
  }

  function showInfo(kind) {
    const data = {
      security: ['SÉCURITÉ', 'Sécurité & P2P', 'Authentification Firebase, stockage Firebase et appels WebRTC utilisent les mécanismes de sécurité du navigateur et de Firebase.'],
      about: ['VIBE', 'À propos de VIBE', 'VIBE est une messagerie moderne avec Discussions, Chaînes, Appels et VIBE AI, présentée dans une interface 2026.']
    }[kind];
    if (!data) return;
    openRightPanel(`<section class="vibe-action-panel"><div class="vibe-action-head"><div><span class="vibe-kicker">${data[0]}</span><h2>${data[1]}</h2><p>${data[2]}</p></div><button class="vibe-action-close" type="button" data-right-close>×</button></div><div class="vibe-action-info"><i class="fa-solid fa-circle-check"></i><b>Espace de travail VIBE</b><span>La navigation reste à gauche. Les actions et leurs contenus sont affichés dans la partie droite.</span></div></section>`, data[1], 'VIBE');
  }

  document.addEventListener('click', e => {
    const target = e.target.closest?.('#railSettings,#theme,#newChat,#profile,#railProfile,#railCommunities,[data-right-close],[data-right-profile],[data-right-theme],[data-right-security],[data-right-about]');
    if (!target) return;
    if (target.matches('#railSettings,#theme,#newChat,#profile,#railProfile,#railCommunities')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (target.id === 'newChat') showNewChat();
      else if (target.id === 'theme') showTheme();
      else if (target.id === 'railCommunities') showCommunities();
      else if (target.id === 'profile' || target.id === 'railProfile') showProfile();
      else showSettings();
      return;
    }
    if (target.matches('[data-right-close]')) { e.preventDefault(); closeRightPanel(); return; }
    if (target.matches('[data-right-profile]')) { e.preventDefault(); showProfile(); return; }
    if (target.matches('[data-right-theme]')) { e.preventDefault(); showTheme(); return; }
    if (target.matches('[data-right-security]')) { e.preventDefault(); showInfo('security'); return; }
    if (target.matches('[data-right-about]')) { e.preventDefault(); showInfo('about'); }
  }, true);

  window.VIBE_RIGHT_ACTIONS = { openRightPanel, closeRightPanel, showSettings, showTheme, showProfile, showCommunities, showNewChat };
})();
