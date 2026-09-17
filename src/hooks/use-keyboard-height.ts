import { useEffect, useRef, useState } from "react";

/**
 * Retorna a altura do teclado virtual no mobile em pixels.
 * Usa a Visual Viewport API com requestAnimationFrame para seguir
 * a animação nativa do teclado frame a frame, sem adicionar transições
 * CSS próprias que causariam dupla animação e travamentos.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Cancela frame anterior se ainda pendente
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const diff = window.innerHeight - vv.height - vv.offsetTop;
        setKeyboardHeight(Math.max(0, diff));
        rafRef.current = null;
      });
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return keyboardHeight;
}
