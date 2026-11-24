import { useEffect } from "react";

const upsertHeadLink = (selector: string, rel: string, href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
};

/**
 * Aplica o favicon da loja (settings.faviconUrl) na aba e no ícone do iPhone.
 * Fonte única usada pelo catálogo (StoreChromeLayout) e pelas páginas fora dele
 * (/links, /pedido/:id, /pedido/:id/sucesso, /pedido/:id/pagamento).
 */
export function applyStoreFavicon(faviconUrl?: string | null) {
  if (!faviconUrl) return;
  upsertHeadLink("link[rel~='icon']", "icon", faviconUrl);
  upsertHeadLink("link[rel='apple-touch-icon']", "apple-touch-icon", faviconUrl);
}

export function useStoreFavicon(faviconUrl?: string | null) {
  useEffect(() => {
    applyStoreFavicon(faviconUrl);
  }, [faviconUrl]);
}
