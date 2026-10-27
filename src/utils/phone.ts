/**
 * Utilitários para formatação e manipulação de números de telefone e WhatsApp.
 */

/**
 * Formata um número de telefone para o padrão internacional do WhatsApp (DDI + DDD + número).
 * No Brasil: adiciona o DDI 55 se o número tiver apenas DDD + número (10 ou 11 dígitos).
 * Isso impede que números com DDD 66 (Mato Grosso), DDD 55 (RS), etc. sejam interpretados
 * erroneamente pelo WhatsApp como código de país de outros países (ex: +66 Tailândia).
 */
export function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (!clean) return "";

  // Se o número tem 10 ou 11 dígitos (padrão Brasil: DDD + telefone fixo ou celular),
  // adiciona o DDI 55 do Brasil na frente.
  if (clean.length <= 11) {
    return `55${clean}`;
  }

  // Se tem 12 ou 13 dígitos e começa com 55, já possui o DDI
  if ((clean.length === 12 || clean.length === 13) && clean.startsWith("55")) {
    return clean;
  }

  return clean;
}
