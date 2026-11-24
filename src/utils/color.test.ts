import { describe, expect, it } from "vitest";
import { prefersDarkText, relativeLuminance } from "./color";

describe("color", () => {
  it("calcula a luminância dos extremos", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
    expect(relativeLuminance("azul")).toBeNull();
  });

  it("pede texto escuro em cores claras e claro em cores escuras", () => {
    expect(prefersDarkText("#facc15")).toBe(true); // amarelo
    expect(prefersDarkText("#a3e635")).toBe(true); // verde-limão
    expect(prefersDarkText("#e11d48")).toBe(false); // vermelho
    expect(prefersDarkText("#1e3a8a")).toBe(false); // azul-escuro
    expect(prefersDarkText("7c3aed")).toBe(false); // sem #
  });

  it("mantém texto claro (padrão do tema) sem cor válida", () => {
    expect(prefersDarkText(undefined)).toBe(false);
    expect(prefersDarkText("")).toBe(false);
    expect(prefersDarkText("rgb(0,0,0)")).toBe(false);
  });
});
