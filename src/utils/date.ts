export function toDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function formatSince(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function journeyYear(journeyStartedAt: string): number {
  const start = new Date(journeyStartedAt);
  const now = new Date();
  const years = now.getFullYear() - start.getFullYear();
  const anniversary =
    now.getMonth() > start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate());
  return Math.max(1, years + (anniversary ? 1 : 0));
}

export function seasonLabel(date: Date = new Date()): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'Early Spring';
  if (month >= 5 && month <= 7) return 'Early Summer';
  if (month >= 8 && month <= 10) return 'Early Autumn';
  return 'Early Winter';
}

export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
