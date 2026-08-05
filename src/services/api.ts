const API_URL = import.meta.env.VITE_ADMIN_API || "http://localhost:3000/api";

export const api = {
  async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
