// Horizontal strip of "similar to this" thumbnails along the bottom of the canvas.

export function createRelatedStrip(container, { onPick, thumbnailURL }) {
  const strip = document.createElement('div');
  strip.className = 'related-strip';
  strip.style.display = 'none';

  const label = document.createElement('div');
  label.className = 'related-label';
  label.textContent = 'Similar';
  strip.appendChild(label);

  const row = document.createElement('div');
  row.className = 'related-row';
  strip.appendChild(row);

  container.appendChild(strip);

  function show(cids) {
    row.innerHTML = '';
    if (!cids || cids.length === 0) { strip.style.display = 'none'; return; }
    for (const cid of cids) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'related-thumb';
      cell.title = `CID ${cid}`;
      cell.setAttribute('aria-label', `Load CID ${cid}`);
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';
      img.src = thumbnailURL(cid);
      cell.appendChild(img);
      cell.addEventListener('click', () => onPick(cid));
      row.appendChild(cell);
    }
    strip.style.display = '';
  }

  function hide() {
    strip.style.display = 'none';
    row.innerHTML = '';
  }

  return { show, hide };
}
