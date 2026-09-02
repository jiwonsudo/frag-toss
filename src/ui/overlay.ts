/** DOM 오버레이 UI 헬퍼 (index.html 의 .ui-* 클래스 사용). */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(
  label: string,
  onClick: () => void,
  opts: { secondary?: boolean; disabled?: boolean } = {}
): HTMLButtonElement {
  const b = el('button', 'ui-btn', label);
  if (opts.secondary) b.classList.add('secondary');
  if (opts.disabled) b.disabled = true;
  else b.addEventListener('click', onClick);
  return b;
}

/** 화면 중앙 정렬 패널. */
export function centerPanel(root: HTMLElement, ...children: (Node | null)[]): HTMLDivElement {
  const wrap = el('div', 'ui-center');
  for (const c of children) if (c) wrap.appendChild(c);
  root.appendChild(wrap);
  return wrap;
}

export function starString(stars: number): string {
  return '★★★'.slice(0, stars) + '☆☆☆'.slice(0, Math.max(0, 3 - stars));
}
