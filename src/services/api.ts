const API_URL = import.meta.env.VITE_ADMIN_API || "http://localhost:3000/api";

/**
 * Retorna o identificador da loja baseado no hostname atual.
 * - Em subdomínio (loja1.lojapod.com): retorna "loja1"
 * - Em domínio próprio (minhaloja.com.br): retorna o hostname completo
 * - Parâmetro ?subdomain=xxx na URL tem prioridade
 */
export function getSubdomain(): string {
  if (typeof window === 'undefined') return 'demo';
  const hostname = window.location.hostname.toLowerCase();

  // Parâmetro de URL tem prioridade
  const urlParams = new URLSearchParams(window.location.search);
  const paramSubdomain = urlParams.get('subdomain') || urlParams.get('domain');
  if (paramSubdomain) return paramSubdomain.toLowerCase();

  // localhost → demo
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'demo';

  return hostname;
}

/**
 * Retorna headers para todas as requisições ao backend.
 * X-Store-Domain: hostname completo (resolve customDomain)
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
    const response = await fetch(`${API_URL}${endpoint}`, {
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
};
