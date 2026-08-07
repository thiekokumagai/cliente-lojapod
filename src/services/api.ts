const API_URL = import.meta.env.VITE_ADMIN_API || "http://localhost:3000/api";

export function getSubdomain(): string {
  if (typeof window === 'undefined') return 'demo';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  const urlParams = new URLSearchParams(window.location.search);
  const paramSubdomain = urlParams.get('subdomain');
  if (paramSubdomain) return paramSubdomain.toLowerCase();

  if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    return parts[0].toLowerCase();
  }

  return 'demo';
}

export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Store-Subdomain": getSubdomain(),
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
