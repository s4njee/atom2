export function createRandomButton(container, { onClick }) {
  container.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'random-btn';
  btn.title = 'Random molecule';
  btn.setAttribute('aria-label', 'Random molecule');
  btn.textContent = '🎲 Random';
  btn.addEventListener('click', () => onClick());
  container.appendChild(btn);
  return btn;
}
