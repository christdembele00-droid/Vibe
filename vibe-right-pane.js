// Vibe navigation: keep secondary screens inside the right pane.
// The left sidebar remains stable while settings and other panels transition.
const moveSettingsToRightPane = () => {
  const settings = document.getElementById('vibeSettings');
  const rightPane = document.getElementById('chatPanel');
  if (!settings || !rightPane) return;
  if (settings.parentElement !== rightPane) rightPane.appendChild(settings);
};

const observeNavigation = () => {
  moveSettingsToRightPane();
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar.dataset.rightPaneObserver === '1') return;
  sidebar.dataset.rightPaneObserver = '1';
  new MutationObserver(moveSettingsToRightPane).observe(sidebar, { childList: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeNavigation, { once: true });
} else {
  observeNavigation();
}
