import { useEffect } from "react";

/**
 * Mantém a altura do teclado virtual em uma variável CSS sem causar
 * re-render do React durante a animação do VisualViewport.
 *
 * Variável disponível: --keyboard-height
 */
export function useKeyboardHeight(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;

    if (!viewport) {
      root.style.setProperty("--keyboard-height", "0px");
      return;
    }

    let rafId: number | null = null;
    let lastHeight = -1;

    const update = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const height = Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
        );

        if (Math.abs(height - lastHeight) >= 2) {
          lastHeight = height;
          root.style.setProperty("--keyboard-height", `${height}px`);
        }

        rafId = null;
      });
    };

    const reset = () => {
      lastHeight = 0;
      root.style.setProperty("--keyboard-height", "0px");
      requestAnimationFrame(update);
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("orientationchange", reset);

    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", reset);

      if (rafId !== null) cancelAnimationFrame(rafId);
      root.style.removeProperty("--keyboard-height");
    };
  }, []);
}
