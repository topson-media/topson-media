/**
 * Accurate relative time formatter to tell viewers how much time since video/feedback was uploaded
 */
export function formatTimeAgo(timestamp?: string | number, lang: 'en' | 'kn' = 'en'): string {
  const justNowText = lang === 'kn' ? 'Ubu ngubu' : 'Just now';

  if (!timestamp) return justNowText;

  let timeMs: number;
  if (typeof timestamp === 'number') {
    timeMs = timestamp;
  } else if (!isNaN(Number(timestamp))) {
    timeMs = Number(timestamp);
  } else {
    // If it's a relative string already (like "Just now", "2 days ago", "Posted 3d ago")
    const cleaned = String(timestamp).replace(/^(posted|uploaded)\s+/i, '').trim();
    const lower = cleaned.toLowerCase();
    if (lower.includes('just now') || lower.includes('ubu ngubu')) {
      return justNowText;
    }
    if (
      lower.includes('ago') ||
      lower.includes('today') ||
      lower.includes('yesterday') ||
      lower.includes('hashize')
    ) {
      return cleaned;
    }

    const parsed = Date.parse(timestamp);
    if (isNaN(parsed)) return cleaned;
    timeMs = parsed;
  }

  const diffMs = Date.now() - timeMs;
  if (diffMs <= 0 || isNaN(diffMs)) return justNowText;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return justNowText;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return lang === 'kn'
      ? `Hashize iminota ${minutes}`
      : `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return lang === 'kn' ? `Hashize amasaha ${hours}` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return lang === 'kn' ? `Hashize iminsi ${days}` : `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return lang === 'kn' ? `Hashize ibyumweru ${weeks}` : `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return lang === 'kn' ? `Hashize amezi ${months}` : `${months}mo ago`;
  }

  const years = Math.floor(days / 365);
  return lang === 'kn' ? `Hashize imyaka ${years}` : `${years}y ago`;
}

export function formatUploadedTimeAgo(timestamp?: string | number, lang: 'en' | 'kn' = 'en'): string {
  const ago = formatTimeAgo(timestamp, lang);
  return ago.replace(/^(posted|uploaded)\s+/i, '');
}

export function formatFeedbackTimeAgo(timestamp?: string | number, lang: 'en' | 'kn' = 'en'): string {
  const ago = formatTimeAgo(timestamp, lang);
  return ago.replace(/^(posted|uploaded)\s+/i, '');
}
