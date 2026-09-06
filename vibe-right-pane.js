// Keep the sidebar stable: secondary screens are hosted in the right pane.
// The settings panel is created lazily by vibe-settings.js, so this observer
// also catches it when it is added after the initial page load.
const getRightPane = () => document.getElementById('chatPanel');
const moveSettingsToRightPane = () => {
  const settings = document.getElementById('vibeSettings');
  const rightPane = getRightPane();
  if (!settings || !rightPane || settings.parentElement === rightPane) return;
  rightPane.appendChild(settings);
};

function initRightPaneNavigation() {
  moveSettingsToRightPane();
  if (document.documentElement.dataset.vibeRightPaneObserver === '1') return;
  document.documentElement.dataset.vibeRightPaneObserver = '1';

  // Settings is lazy-created. Watching the body avoids depending on the
  // order in which the bootstrap modules create their DOM elements.
  const observer = new MutationObserver(() => moveSettingsToRightPane());
  observer.observe(document.body, { childList: true, subtree: true });

  // Keep keyboard navigation predictable without changing the existing UI.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const settings = document.getElementById('vibeSettings');
    if (!settings || settings.classList.contains('hidden')) return;
    document.getElementById('vibeSettingsClose')?.click();
  });

  document.addEventListener('vibe:open-settings', () => moveSettingsToRightPane());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRightPaneNavigation, { once: true });
} else {
  initRightPaneNavigation();
}
