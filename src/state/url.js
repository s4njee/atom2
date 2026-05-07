const VALID_STYLES = new Set(['neon', 'crystal', 'toon', 'painterly']);

export function readURLState() {
  const params = new URLSearchParams(window.location.search);
  const rawCID = params.get('cid');
  const cid = rawCID && /^\d+$/.test(rawCID) ? Number(rawCID) : null;
  const rawStyle = params.get('style');
  const style = rawStyle && VALID_STYLES.has(rawStyle) ? rawStyle : null;
  return { cid, style };
}

export function writeURLState({ cid, style }) {
  const params = new URLSearchParams();
  if (cid != null) params.set('cid', String(cid));
  if (style != null) params.set('style', style);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState({}, '', url);
}
