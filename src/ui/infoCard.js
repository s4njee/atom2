// Subtle bottom-left card on the canvas: name, formula, molecular weight, InChIKey.

function formatFormula(s) {
  // Subscripts: replace digits with their unicode subscripts so "C9H8O4" → "C₉H₈O₄"
  const subs = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
  return s.replace(/\d/g, (d) => subs[d]);
}

export function createInfoCard(container) {
  const card = document.createElement('div');
  card.className = 'info-card';
  card.style.display = 'none';

  const title = document.createElement('div');
  title.className = 'info-card-title';
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'info-card-meta';
  card.appendChild(meta);

  const inchi = document.createElement('div');
  inchi.className = 'info-card-inchi';
  inchi.title = 'Click to copy InChIKey';
  inchi.addEventListener('click', () => {
    if (inchi.textContent) navigator.clipboard?.writeText(inchi.textContent);
  });
  card.appendChild(inchi);

  container.appendChild(card);

  function show(data) {
    if (!data) { card.style.display = 'none'; return; }
    title.textContent = data.title || (data.cid != null ? `CID ${data.cid}` : '');
    const parts = [];
    if (data.formula) parts.push(formatFormula(data.formula));
    if (data.weight != null && isFinite(data.weight)) parts.push(`${data.weight.toFixed(2)} g/mol`);
    meta.textContent = parts.join(' · ');
    inchi.textContent = data.inchiKey || '';
    card.style.display = '';
  }

  function hide() {
    card.style.display = 'none';
    title.textContent = meta.textContent = inchi.textContent = '';
  }

  return { show, hide };
}
