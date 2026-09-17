import { useEffect, useState } from "react";

/**
 * Retorna a altura do teclado virtual no mobile em pixels.
 * Usa a Visual Viewport API para detectar quando o teclado aparece.
 * Quando o teclado está fechado, retorna 0.
 *
 * Use este valor para aplicar `paddingBottom` ou `marginBottom` em modais
 * que contêm inputs, garantindo que o conteúdo não fique atrás do teclado.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // A diferença entre o height do layout viewport e o visual viewport
      // corresponde à altura ocupada pelo teclado virtual.
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      const diff = layoutHeight - visualHeight - vv.offsetTop;
      setKeyboardHeight(Math.max(0, diff));
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return keyboardHeight;
}
