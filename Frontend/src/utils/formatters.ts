/**
 * Formats large counts into human-readable shorthand (e.g., 2500000 -> "2.5m", 48400 -> "48.4k")
 */
export function formatAudienceCount(count?: number, fallback = '0'): string {
  if (count === undefined || count === null) return fallback;
  if (count >= 1000000) {
    const val = count / 1000000;
    return val % 1 === 0 ? `${val}m` : `${val.toFixed(2).replace(/\.?0+$/, '')}m`;
  }
  if (count >= 10000) {
    const val = count / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1).replace(/\.?0+$/, '')}k`;
  }
  return count.toLocaleString();
}

/**
 * Formats ISO date string to readable short date (e.g. "Oct 10, 2026")
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'Recent';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
