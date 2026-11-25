import { toTelugu } from '@/i18n/translate';

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'CODE']);
const ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;

interface Swap { source: string; shown: string }

/**
 * Shows the words on screen in Telugu letters without each screen having to ask. The English text is remembered, so it is
 * put back when English is chosen again, and a screen that changes its own text is translated again from the new text.
 * Anything inside an element marked translate="no" is left alone.
 */
export function startPageTranslation(root: HTMLElement): () => void {
  const texts = new WeakMap<Text, Swap>();
  const attributes = new WeakMap<Element, Map<string, Swap>>();
  const touchedTexts = new Set<WeakRef<Text>>();
  const touchedElements = new Set<WeakRef<Element>>();

  const skipped = (node: Node): boolean => {
    const element = node instanceof Element ? node : node.parentElement;
    return !element || SKIP.has(element.tagName) || element.closest('[translate="no"]') !== null;
  };

  const translateText = (node: Text) => {
    if (skipped(node)) return;
    const value = node.nodeValue ?? '';
    const known = texts.get(node);
    if (known && value === known.shown) return;
    const shown = toTelugu(value);
    if (shown === value) {
      texts.delete(node);
      return;
    }
    texts.set(node, { source: value, shown });
    touchedTexts.add(new WeakRef(node));
    node.nodeValue = shown;
  };

  const translateAttributes = (element: Element) => {
    if (skipped(element)) return;
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (!value) continue;
      const known = attributes.get(element)?.get(name);
      if (known && value === known.shown) continue;
      const shown = toTelugu(value);
      if (shown === value) continue;
      const map = attributes.get(element) ?? new Map<string, Swap>();
      map.set(name, { source: value, shown });
      attributes.set(element, map);
      touchedElements.add(new WeakRef(element));
      element.setAttribute(name, shown);
    }
  };

  const walk = (start: Node) => {
    if (start.nodeType === Node.TEXT_NODE) {
      translateText(start as Text);
      return;
    }
    if (!(start instanceof Element)) return;
    translateAttributes(start);
    const texts = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
    for (let node = texts.nextNode(); node; node = texts.nextNode()) translateText(node as Text);
    start.querySelectorAll('[placeholder],[title],[aria-label]').forEach(translateAttributes);
  };

  walk(root);
  let pending = false;
  const queue: Node[] = [];
  const flush = () => {
    pending = false;
    observer.disconnect();
    queue.splice(0).forEach((node) => { if (node.isConnected) walk(node); });
    observe();
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach((node) => queue.push(node));
      else queue.push(record.target);
    }
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(flush);
    }
  });
  const observe = () => observer.observe(root, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES],
  });
  observe();

  return () => {
    observer.disconnect();
    touchedTexts.forEach((ref) => {
      const node = ref.deref();
      const swap = node && texts.get(node);
      if (node && swap && node.nodeValue === swap.shown) node.nodeValue = swap.source;
    });
    touchedElements.forEach((ref) => {
      const element = ref.deref();
      attributes.get(element as Element)?.forEach((swap, name) => {
        if (element?.getAttribute(name) === swap.shown) element.setAttribute(name, swap.source);
      });
    });
  };
}
