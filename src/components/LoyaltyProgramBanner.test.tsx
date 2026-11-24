import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoyaltyProgramBanner from "./LoyaltyProgramBanner";
import { storeLoyaltyService, type StoreLoyaltyProgram } from "@/services/loyalty";

const mockSettings: { primaryColor?: string } = {};
vi.mock("@/hooks/useStoreSettings", () => ({
  useStoreSettings: () => ({ data: mockSettings }),
}));

const baseProgram: StoreLoyaltyProgram = {
  id: "p1",
  storeId: "s1",
  isActive: true,
  type: "FREE_PRODUCT",
  stampsRequired: 8,
  minOrderValue: 0,
  validityDays: 90,
  rewardText: "1 açaí de 500ml",
};

const renderBanner = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoyaltyProgramBanner />
    </QueryClientProvider>,
  );
};

describe("LoyaltyProgramBanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete mockSettings.primaryColor;
  });

  it("mostra o programa de selos da loja, consultando sem telefone do cliente", async () => {
    const spy = vi.spyOn(storeLoyaltyService, "getCard").mockResolvedValue({ card: null, program: baseProgram });
    renderBanner();
    expect(await screen.findByRole("heading", { name: "Ganhe 1 açaí de 500ml" })).toBeInTheDocument();
    expect(screen.getByText("A cada 8 compras")).toBeInTheDocument();
    // regras ficam recolhidas até tocar em "Regras"
    expect(screen.queryByText("válido por 90 dias")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Regras/ }));
    expect(screen.getByText("válido por 90 dias")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fechar/ })).toHaveAttribute("aria-expanded", "true");
    expect(spy).toHaveBeenCalledWith();
    expect(screen.queryByText(/selos$/)).not.toBeInTheDocument();
  });

  it("não repete 'Ganhe' quando o prêmio cadastrado já começa com ele", async () => {
    vi.spyOn(storeLoyaltyService, "getCard").mockResolvedValue({
      card: null,
      program: { ...baseProgram, stampsRequired: 10, rewardText: "Ganhe 1 Onigiri da sua Escolha!" },
    });
    renderBanner();
    expect(await screen.findByRole("heading", { name: "Ganhe 1 Onigiri da sua Escolha" })).toBeInTheDocument();
  });

  it("mostra cashback e o pedido mínimo para pontuar", async () => {
    vi.spyOn(storeLoyaltyService, "getCard").mockResolvedValue({
      card: null,
      program: { ...baseProgram, type: "CASHBACK", cashbackPercent: 7, minOrderValue: 30 },
    });
    renderBanner();
    expect(await screen.findByRole("heading", { name: "7% de volta em cada compra" })).toBeInTheDocument();
    expect(screen.getByText("O valor volta como saldo para a próxima compra")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Regras/ }));
    expect(screen.getByText(/mín\. R\$\s?30,00 p\/ pontuar/)).toBeInTheDocument();
  });

  it("mostra os níveis do desconto progressivo configurados pela loja", async () => {
    vi.spyOn(storeLoyaltyService, "getCard").mockResolvedValue({
      card: null,
      program: {
        ...baseProgram,
        type: "PROGRESSIVE_DISCOUNT",
        progressiveTiers: [
          { minOrders: 6, discountPercent: 8 },
          { minOrders: 2, discountPercent: 4 },
        ],
      },
    });
    renderBanner();
    expect(await screen.findByRole("heading", { name: "Até 8% OFF nos seus pedidos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Regras/ }));
    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "2 pedidos: 4%",
      "6 pedidos: 8%",
      "válido por 90 dias",
    ]);
  });

  it("usa a cor da loja com texto claro quando a cor é escura", async () => {
    mockSettings.primaryColor = "#7c3aed";
    vi.spyOn(storeLoyaltyService, "getCard").mockResolvedValue({ card: null, program: baseProgram });
    renderBanner();
    const card = await screen.findByRole("region", { name: "Programa de fidelidade da loja" });
    expect(card.className).toContain("bg-primary");
    expect(card.className).toContain("text-primary-foreground");
  });

  it("troca para texto escuro quando a cor da loja é clara", async () => {
    mockSettings.primaryColor = "#facc15";
    vi.spyOn(storeLoyaltyService, "getCard").mockResolvedValue({ card: null, program: baseProgram });
    renderBanner();
    const card = await screen.findByRole("region", { name: "Programa de fidelidade da loja" });
    expect(card.className).toContain("text-slate-900");
    expect(card.className).not.toContain("text-primary-foreground");
  });

  it("não aparece quando o programa está desativado", async () => {
    const spy = vi
      .spyOn(storeLoyaltyService, "getCard")
      .mockResolvedValue({ card: null, program: { ...baseProgram, isActive: false } });
    const { container } = renderBanner();
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("não aparece quando a loja não tem programa ou a API falha", async () => {
    const spy = vi.spyOn(storeLoyaltyService, "getCard").mockRejectedValue(new Error("falha"));
    const { container } = renderBanner();
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
