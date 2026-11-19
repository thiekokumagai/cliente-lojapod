import { useEffect } from "react";

export const NOINDEX_CONTENT = "noindex, nofollow, noarchive, nosnippet";
const ROBOTS_NAMES = ["robots", "googlebot"] as const;

/**
 * Impede indexação em buscadores (Google, Bing, etc.) enquanto a página estiver aberta,
 * restaurando/removendo as tags `<meta name="robots">` e `<meta name="googlebot">` ao sair.
 */
export function useNoIndex(): void {
  useEffect(() => {
    const restoreCallbacks: Array<() => void> = [];

    for (const name of ROBOTS_NAMES) {
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (existing) {
        const previousContent = existing.getAttribute("content");
        existing.setAttribute("content", NOINDEX_CONTENT);
        restoreCallbacks.push(() => {
          if (previousContent === null) {
            existing.removeAttribute("content");
          } else {
            existing.setAttribute("content", previousContent);
          }
        });
      } else {
        const meta = document.createElement("meta");
        meta.setAttribute("name", name);
        meta.setAttribute("content", NOINDEX_CONTENT);
        document.head.appendChild(meta);
        restoreCallbacks.push(() => {
          meta.remove();
        });
      }
    }

    return () => {
      for (const restore of restoreCallbacks) {
        restore();
      }
    };
  }, []);
}
