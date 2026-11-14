import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();

vi.mock("./api", () => ({
  api: { post: (...args: unknown[]) => post(...args) },
}));

import { getSessionId, sendCartContact } from "./analytics";

describe("sendCartContact", () => {
  beforeEach(() => {
    post.mockReset();
    sessionStorage.clear();
  });

  it("envia nome, telefone e a sessão do carrinho para o endpoint de contato", async () => {
    post.mockResolvedValue({ success: true });

    await sendCartContact("João da Silva", "(67) 99213-0201");

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/analytics/cart/contact", {
      sessionId: getSessionId(),
      name: "João da Silva",
      phone: "(67) 99213-0201",
    });
  });

  it("usa a mesma sessão do carrinho (não cria outra)", async () => {
    post.mockResolvedValue({ success: true });

    const before = getSessionId();
    await sendCartContact("Maria Souza", "(11) 98888-7777");

    expect(getSessionId()).toBe(before);
  });

  it("falha de rede não quebra o checkout", async () => {
    post.mockRejectedValue(new Error("offline"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendCartContact("João da Silva", "(67) 99213-0201")).resolves.toBeUndefined();

    spy.mockRestore();
  });
});
