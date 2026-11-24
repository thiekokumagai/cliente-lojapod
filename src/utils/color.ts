const parseHex = (hex: string): [number, number, number] | null => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
};

/** Luminância relativa (WCAG 2.x), de 0 (preto) a 1 (branco). */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Diz se o texto sobre a cor deve ser escuro. Compara o contraste com branco e com
 * quase-preto (#0f172a) e fica com o maior. Cor inválida ou ausente: texto claro,
 * que é o padrão do tema (--primary-foreground branco).
 */
export function prefersDarkText(hex?: string | null): boolean {
  if (!hex) return false;
  const lum = relativeLuminance(hex);
  if (lum === null) return false;
  const dark = 0.0137; // luminância de #0f172a
  const contrastWithWhite = 1.05 / (lum + 0.05);
  const contrastWithDark = (lum + 0.05) / (dark + 0.05);
  return contrastWithDark > contrastWithWhite;
}
