export function createStatusBar(container) {
  function set(message, kind = 'info') {
    if (!message) {
      container.classList.remove('visible');
      container.textContent = '';
      return;
    }
    container.textContent = message;
    container.style.background = kind === 'error' ? 'rgba(180,40,40,0.85)' : 'rgba(0,0,0,0.7)';
    container.classList.add('visible');
  }
  return { set };
}
