import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, getSubdomain } from "./api";
import { getAppHostLabel, getAppUrl } from "@/components/StoreNotFound";
import { getAppUrl as getOfflineAppUrl } from "@/components/StoreOffline";

describe("cliente-lojapod: resolução de múltiplos domínios-base (lojapod.com e podipedir.com.br)", () => {
  const originalLocation = window.location;

  function mockLocation(hostname: string, search = "") {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        hostname,
        search,
        protocol: "https:",
        port: "",
      },
    });
  }

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllEnvs();
  });

  it("extrai o subdomínio tanto em .lojapod.com quanto em .podipedir.com.br", () => {
    mockLocation("sopod.lojapod.com");
    expect(getSubdomain()).toBe("sopod");

    mockLocation("demo.podipedir.com.br");
    expect(getSubdomain()).toBe("demo");

    mockLocation("www.demo.podipedir.com.br");
    expect(getSubdomain()).toBe("demo");
  });

  it("extrai o subdomínio de *.localhost em ambiente local", () => {
    mockLocation("demo.localhost");
    expect(getSubdomain()).toBe("demo");

    mockLocation("minhaloja.localhost");
    expect(getSubdomain()).toBe("minhaloja");

    mockLocation("localhost");
    expect(getSubdomain()).toBe("demo");
  });

  it("mantém o hostname completo quando for domínio próprio de lojista", () => {
    mockLocation("hnperfumes.com.br");
    expect(getSubdomain()).toBe("hnperfumes.com.br");
  });

  it("troca a URL da API para api.podipedir.com.br quando acessado por *.podipedir.com.br", () => {
    vi.stubEnv("VITE_ADMIN_API", "https://api.lojapod.com/api");

    mockLocation("demo.podipedir.com.br");
    expect(getApiBaseUrl()).toBe("https://api.podipedir.com.br/api");

    mockLocation("demo.lojapod.com");
    expect(getApiBaseUrl()).toBe("https://api.lojapod.com/api");
  });

  it("StoreNotFound e StoreOffline apontam para podipedir.com.br quando em *.podipedir.com.br", () => {
    mockLocation("inexistente.podipedir.com.br");
    expect(getAppUrl()).toBe("https://podipedir.com.br");
    expect(getOfflineAppUrl()).toBe("https://podipedir.com.br");
    expect(getAppHostLabel()).toBe("podipedir.com.br");

    mockLocation("inexistente.lojapod.com");
    expect(getAppUrl()).toBe("https://app.lojapod.com");
    expect(getOfflineAppUrl()).toBe("https://app.lojapod.com");
    expect(getAppHostLabel()).toBe("app.lojapod.com");
  });
});
