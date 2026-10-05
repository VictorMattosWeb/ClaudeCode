import "@testing-library/jest-dom";

// Tudo aqui depende de DOM. Os testes de logica pura rodam em ambiente `node`
// (ver vitest.config.ts), e sem o guard o setup quebraria neles.
if (typeof window !== "undefined") {
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
}

// Shims necessários para Radix UI (Popover/Dialog) em JSDOM
if (typeof window !== "undefined") {
  // ResizeObserver
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver =
    (window as unknown as { ResizeObserver?: unknown }).ResizeObserver ??
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  // PointerEvent capture (Radix usa em popper)
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
