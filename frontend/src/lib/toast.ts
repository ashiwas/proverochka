/** Лёгкое всплывающее уведомление без библиотек — короткий тост сверху по центру. */
export function flash(text: string) {
  const el = document.createElement('div');
  el.textContent = text;
  el.className =
    'fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface shadow-lg';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
