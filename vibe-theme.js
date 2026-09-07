const THEME_KEY = 'vibe_theme';

function applySavedTheme() {
  try {
    document.body.classList.toggle('dark-theme', localStorage.getItem(THEME_KEY) === 'dark');
  } catch {
    document.body.classList.remove('dark-theme');
  }
}

function setTheme(isDark) {
  document.body.classList.toggle('dark-theme', isDark);
  try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (error) { console.warn('[Vibe] Thème local:', error); }
}

function installThemeControl() {
  const settingsCard = [...document.querySelectorAll('.feature-card')].find(card => card.querySelector('.setting-row'));
  if (!settingsCard || settingsCard.querySelector('#vibe-theme-toggle')) return;

  const row = document.createElement('div');
  row.className = 'setting-row vibe-theme-row';
  row.innerHTML = `<span>Thème</span><button class="secondary-btn" id="vibe-theme-toggle" type="button"></button>`;
  settingsCard.appendChild(row);

  const button = row.querySelector('#vibe-theme-toggle');
  const sync = () => {
    const dark = document.body.classList.contains('dark-theme');
    button.textContent = dark ? '☀️ Mode clair' : '🌙 Mode sombre';
    button.setAttribute('aria-pressed', String(dark));
  };
  button.addEventListener('click', () => { setTheme(!document.body.classList.contains('dark-theme')); sync(); });
  sync();
}

applySavedTheme();

document.addEventListener('click', event => {
  const settingsButton = event.target.closest?.('#btn-settings');
  if (!settingsButton) return;
  setTimeout(installThemeControl, 0);
  setTimeout(installThemeControl, 100);
  setTimeout(installThemeControl, 300);
  setTimeout(() => import('./vibe-profile-lock.js?v=1'), 0);
});

const observer = new MutationObserver(() => {
  if (document.getElementById('btn-settings')) installThemeControl();
});
observer.observe(document.body, { childList: true, subtree: true });

export { setTheme, applySavedTheme, installThemeControl };
