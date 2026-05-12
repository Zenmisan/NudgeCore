export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function randomSnoozeMs(): number {
  const minutes = Math.floor(Math.random() * 10) + 1;
  return minutes * 60 * 1000;
}

export function formatDueAt(due_at: number | null): string | null {
  if (due_at === null) return null;
  const d = new Date(due_at);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();
  if (isTomorrow) return `Tomorrow ${time}`;

  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${time}`;
}
