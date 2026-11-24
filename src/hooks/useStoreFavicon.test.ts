import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { applyStoreFavicon, useStoreFavicon } from "./useStoreFavicon";

const iconHref = () => document.head.querySelector<HTMLLinkElement>("link[rel~='icon']")?.href;
const appleHref = () => document.head.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")?.href;

describe("useStoreFavicon", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("cria os links de ícone com o favicon da loja quando não existem", () => {
    applyStoreFavicon("https://cdn.exemplo.com/favicon-loja.png");
    expect(iconHref()).toBe("https://cdn.exemplo.com/favicon-loja.png");
    expect(appleHref()).toBe("https://cdn.exemplo.com/favicon-loja.png");
  });

  it("substitui o ícone padrão do index.html em vez de duplicar", () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico">';
    applyStoreFavicon("https://cdn.exemplo.com/favicon-loja.png");
    expect(document.head.querySelectorAll("link[rel~='icon']")).toHaveLength(1);
    expect(iconHref()).toBe("https://cdn.exemplo.com/favicon-loja.png");
  });

  it("não mexe no ícone quando a loja não tem favicon", () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico">';
    applyStoreFavicon(undefined);
    expect(iconHref()).toMatch(/\/favicon\.ico$/);
  });

  it("aplica quando os settings chegam depois da montagem (página do pedido)", () => {
    const { rerender } = renderHook(({ url }) => useStoreFavicon(url), {
      initialProps: { url: undefined as string | undefined },
    });
    expect(iconHref()).toBeUndefined();
    rerender({ url: "https://cdn.exemplo.com/favicon-loja.png" });
    expect(iconHref()).toBe("https://cdn.exemplo.com/favicon-loja.png");
  });
});
