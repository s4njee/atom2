import { COLLECTIONS } from '../data/collections.js';

// Flatten all curated collections into a single pool of known-good CIDs.
const POOL = COLLECTIONS.flatMap((c) => c.entries);

export function createRandomButton(container, { onPick }) {
  container.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'random-btn';
  btn.title = 'Random molecule';
  btn.setAttribute('aria-label', 'Random molecule');
  btn.textContent = '🎲 Random';
  btn.addEventListener('click', () => {
    if (POOL.length === 0) return;
    const pick = POOL[Math.floor(Math.random() * POOL.length)];
    onPick(pick);
  });
  container.appendChild(btn);
  return btn;
}
