const PLATFORM_BASE_DOMAINS = ["lojapod.com", "podipedir.com.br"] as const;
const RESERVED_SUBDOMAINS = new Set(["app", "admin", "api", "www"]);

/**
 * Resolve a URL base da API mantendo o mesmo domínio-base da janela atual
 * (ex.: em *.podipedir.com.br usa https://api.podipedir.com.br/api).
 */
export function getApiBaseUrl(): string {
  let base = import.meta.env.VITE_ADMIN_API || "http://localhost:3000/api";
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    if (
      (host === "podipedir.com.br" || host.endsWith(".podipedir.com.br")) &&
      base.includes("api.lojapod.com")
    ) {
      base = base.replace("api.lojapod.com", "api.podipedir.com.br");
    } else if (
      (host === "lojapod.com" || host.endsWith(".lojapod.com")) &&
      base.includes("api.podipedir.com.br")
    ) {
      base = base.replace("api.podipedir.com.br", "api.lojapod.com");
    }
  }
  return base;
}

/**
 * Retorna o identificador da loja baseado no hostname atual.
 * - Em subdomínio (loja1.lojapod.com ou loja1.podipedir.com.br): retorna "loja1"
 * - Em domínio próprio (minhaloja.com.br): retorna o hostname completo
 * - Parâmetro ?subdomain=xxx na URL tem prioridade
 */
export function getSubdomain(): string {
  if (typeof window === "undefined") return "demo";
  const hostname = window.location.hostname.toLowerCase();

  // Parâmetro de URL tem prioridade
  const urlParams = new URLSearchParams(window.location.search);
  const paramSubdomain = urlParams.get("subdomain") || urlParams.get("domain");
  if (paramSubdomain) return paramSubdomain.toLowerCase();

  // localhost → demo
  if (hostname === "localhost" || hostname === "127.0.0.1") return "demo";

  const cleanHost = hostname.replace(/^www\./, "");

  // Se for subdomínio nativo (.lojapod.com ou .podipedir.com.br)
  for (const baseDomain of PLATFORM_BASE_DOMAINS) {
    const suffix = `.${baseDomain}`;
    if (cleanHost.endsWith(suffix)) {
      const prefix = cleanHost.slice(0, -suffix.length);
      const firstSegment = prefix.split(".")[0];
      if (firstSegment && !RESERVED_SUBDOMAINS.has(firstSegment)) {
        return firstSegment;
      }
    }
  }

  return hostname;
}

/**
 * Retorna headers para todas as requisições ao backend.
 * X-Store-Domain: identificador resolvido (subdomínio da loja ou customDomain)
 * X-Store-Subdomain: igual ao X-Store-Domain (compatibilidade)
 */
export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const domain = getSubdomain();
  return {
    "Content-Type": "application/json",
    "X-Store-Domain": domain,
    "X-Store-Subdomain": domain,
    ...additionalHeaders,
  };
}

export const api = {
  async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = "Erro na requisição";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  },

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "GET",
      headers: getApiHeaders(),
    });

    if (!response.ok) {
      let errorMessage = "Erro na requisição";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // ignore
      }
      throw Object.assign(new Error(errorMessage), { status: response.status });
    }

    return response.json() as Promise<T>;
  },
};
