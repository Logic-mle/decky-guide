/** Use Decky's existing page scroller instead of creating a nested reading pane. */
export function findPageScroller(element: HTMLElement): HTMLElement {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
  }
  return element.ownerDocument.scrollingElement as HTMLElement || element.ownerDocument.documentElement;
}

export function scrollViewportTop(scroller: HTMLElement): number {
  return scroller === scroller.ownerDocument.scrollingElement ? 0 : scroller.getBoundingClientRect().top + scroller.clientTop;
}
