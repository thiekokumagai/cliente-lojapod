import { describe, expect, it } from "vitest";
import {
  buildOriginAddress,
  computeFreightPrice,
  getFreightPrice,
  validateDistance,
  type FreightPriceSettings,
} from "./use-calculator-freight";
import { formatFreightDestinationAddress } from "@/utils/freight-address";

/**
 * PARIDADE COM O SERVIDOR. As tabelas abaixo são IGUAIS às de
 * `api-lojapod/src/modules/orders/domain/utils/freight-rules.spec.ts` (gerado a partir dele).
 * O servidor recalcula o frete do pedido público com a regra dele; se as duas tabelas passam nos dois lados,
 * o navegador e o servidor dão o mesmo frete, a mesma área de entrega e os mesmos endereços para o Google.
 * Se mudar uma regra de frete, mude as duas tabelas (e as duas implementações).
 */
type Config = FreightPriceSettings & {
  deliveryRanges?: { ranges?: Array<{ id: string; distancia: number; valor: number }>; allowAboveMax?: boolean; maxDeliveryKm?: number } | null;
};

// fora de ordem de propósito: a regra ordena por distância
const RANGES = [
  { id: 'c', distancia: 10, valor: 12 },
  { id: 'a', distancia: 2, valor: 5 },
  { id: 'b', distancia: 5, valor: 8 },
];

const PRICE_CASES: Array<[number, number]> = [
  [0, 5],
  [1.9, 5],
  [2, 5], // a divisa vale para a faixa de baixo (<=)
  [2.01, 8],
  [5, 8],
  [5.01, 12],
  [10, 12],
  [10.01, 12], // passou da última faixa: vale o preço da última
  [250, 12],
];

const DISTANCE_CASES: Array<{
  km: number;
  allowAboveMax: boolean;
  customMax: number | null;
  error: string | null;
}> = [
  { km: 10, allowAboveMax: false, customMax: null, error: null },
  { km: 10.04, allowAboveMax: false, customMax: null, error: null }, // arredonda para 10.0
  { km: 10.06, allowAboveMax: false, customMax: null, error: 'Endereço fora da área de entrega (máximo 10km).' },
  { km: 50, allowAboveMax: true, customMax: null, error: null },
  { km: 7.04, allowAboveMax: false, customMax: 7, error: null },
  { km: 7.06, allowAboveMax: false, customMax: 7, error: 'Endereço fora da área de entrega (máximo 7km).' },
  { km: 50, allowAboveMax: true, customMax: 7, error: 'Endereço fora da área de entrega (máximo 7km).' }, // raio máximo vale mesmo com "acima do máximo"
  { km: 12, allowAboveMax: false, customMax: 15, error: null }, // o raio máximo substitui o da maior faixa
  { km: 12, allowAboveMax: false, customMax: 0, error: 'Endereço fora da área de entrega (máximo 10km).' }, // 0 = sem raio próprio
];

const COMPUTE_CASES: Array<{
  name: string;
  config: Config;
  km: number;
  cart?: number;
  expected: number | null | 'FORA';
}> = [
  { name: 'por distância (faixa do meio)', config: { deliveryRanges: { ranges: RANGES } }, km: 3, cart: 50, expected: 8 },
  { name: 'DISTANCE explícito', config: { deliveryType: 'DISTANCE', deliveryRanges: { ranges: RANGES } }, km: 1, expected: 5 },
  { name: 'sem faixas: a combinar', config: { deliveryType: 'DISTANCE', deliveryRanges: { ranges: [] } }, km: 3, expected: null },
  { name: 'sem configuração de faixas: a combinar', config: {}, km: 3, expected: null },
  { name: 'NO_FEE', config: { deliveryType: 'NO_FEE', deliveryRanges: { ranges: RANGES } }, km: 9, expected: 0 },
  { name: 'FIXED_FEE', config: { deliveryType: 'FIXED_FEE', deliveryFixedFee: 6 }, km: 9, expected: 6 },
  { name: 'FIXED_FEE como texto', config: { deliveryType: 'FIXED_FEE', deliveryFixedFee: '6.5' }, km: 9, expected: 6.5 },
  { name: 'FIXED_FEE sem valor', config: { deliveryType: 'FIXED_FEE' }, km: 9, expected: 0 },
  { name: 'TO_COMBINE', config: { deliveryType: 'TO_COMBINE' }, km: 9, expected: null },
  {
    name: 'frete grátis: carrinho no mínimo',
    config: { freeShippingEnabled: true, freeShippingMinValue: 100, deliveryRanges: { ranges: RANGES } },
    km: 9,
    cart: 100,
    expected: 0,
  },
  {
    name: 'frete grátis: abaixo do mínimo cobra a faixa',
    config: { freeShippingEnabled: true, freeShippingMinValue: 100, deliveryRanges: { ranges: RANGES } },
    km: 9,
    cart: 99.99,
    expected: 12,
  },
  {
    name: 'frete grátis: valor mínimo como texto',
    config: { freeShippingEnabled: true, freeShippingMinValue: '100', deliveryRanges: { ranges: RANGES } },
    km: 3,
    cart: 150,
    expected: 0,
  },
  {
    name: 'frete grátis desligado',
    config: { freeShippingEnabled: false, freeShippingMinValue: 100, deliveryRanges: { ranges: RANGES } },
    km: 3,
    cart: 500,
    expected: 8,
  },
  {
    name: 'frete grátis sem carrinho informado não vale',
    config: { freeShippingEnabled: true, freeShippingMinValue: 100, deliveryRanges: { ranges: RANGES } },
    km: 3,
    expected: 8,
  },
  {
    name: 'frete grátis com mínimo zero é ignorado',
    config: { freeShippingEnabled: true, freeShippingMinValue: 0, deliveryRanges: { ranges: RANGES } },
    km: 3,
    cart: 500,
    expected: 8,
  },
  {
    name: 'frete grátis também zera taxa fixa',
    config: { deliveryType: 'FIXED_FEE', deliveryFixedFee: 6, freeShippingEnabled: true, freeShippingMinValue: 50 },
    km: 3,
    cart: 60,
    expected: 0,
  },
  {
    name: 'acima do máximo sem permissão: fora da área',
    config: { deliveryRanges: { ranges: RANGES, allowAboveMax: false } },
    km: 11,
    expected: 'FORA',
  },
  {
    name: 'acima do máximo com permissão: preço da última faixa',
    config: { deliveryRanges: { ranges: RANGES, allowAboveMax: true } },
    km: 11,
    expected: 12,
  },
  {
    name: 'raio máximo vale para taxa fixa também',
    config: { deliveryType: 'FIXED_FEE', deliveryFixedFee: 6, deliveryRanges: { ranges: [], maxDeliveryKm: 8 } },
    km: 9,
    expected: 'FORA',
  },
];

const DESTINATION_CASES: Array<[Record<string, string>, string]> = [
  [{ street: 'Rua Goiânia, 2386', number: '2386', neighborhood: 'Vila Birigui', city: 'Rondonópolis', state: 'MT' }, 'Rua Goiânia, 2386, Vila Birigui, Rondonópolis, MT'],
  [{ street: 'Rua Goiânia', number: '2386', neighborhood: 'Vila Birigui', city: 'Rondonópolis', state: 'MT' }, 'Rua Goiânia, 2386, Vila Birigui, Rondonópolis, MT'],
  [{ street: 'Av. Afonso Pena', number: 'S/N', neighborhood: 'Centro', city: 'Campo Grande', state: 'MS' }, 'Av. Afonso Pena, Centro, Campo Grande, MS'],
  [{ street: 'Rua X, s/n', number: '', neighborhood: 'Centro', city: 'Campo Grande', state: 'MS' }, 'Rua X, Centro, Campo Grande, MS'],
  [{ street: 'Rua A', number: '0', neighborhood: 'Bairro', city: 'Cidade', state: 'MS' }, 'Rua A, Bairro, Cidade, MS'],
  [{ street: 'Rua A', number: '10', neighborhood: 'Bairro', city: '', state: 'MS' }, 'Rua A, 10, Bairro, MS'],
  [{ street: '  Rua B  ', number: ' 5 ', neighborhood: '', city: 'Cidade', state: 'MS' }, 'Rua B, 5, Cidade, MS'],
  [{ street: '', number: '5', neighborhood: 'Bairro', city: 'Cidade', state: 'MS' }, ''],
];

const ORIGIN_CASES: Array<[Record<string, string>, string]> = [
  [{ street: 'Rua 14 de Julho', number: '539', city: 'Campo Grande', state: 'MS', cep: '79002-330' }, 'Rua 14 de Julho, 539, Campo Grande - MS, CEP 79002330, Brasil'],
  [{ street: 'Av A', number: '1', deliveryOriginNumber: '99', cep: '1', deliveryOriginCep: '79.000-111', city: 'X', state: 'MS' }, 'Av A, 99, X - MS, CEP 79000111, Brasil'],
  [{ number: '12', cep: '79010-000' }, 'CEP 79010000, 12, Brasil'],
  [{}, 'CEP 79000000, Brasil'],
  [{ street: 'Rua Z', cep: '79000-000' }, 'Rua Z, CEP 79000000, Brasil'],
];


/** Mesma ordem do `calculate` do hook: área de entrega primeiro, depois o preço. */
function frontFreight(config: Config, km: number, cart?: number): number | null | "FORA" {
  const ranges = config.deliveryRanges?.ranges || [];
  const allowAboveMax = !!config.deliveryRanges?.allowAboveMax;
  const customMax = config.deliveryRanges?.maxDeliveryKm ? Number(config.deliveryRanges.maxDeliveryKm) : null;
  if (validateDistance(km, ranges, allowAboveMax, customMax)) return "FORA";
  return computeFreightPrice(config, km, cart);
}

describe("frete do navegador = frete do servidor (mesma tabela de casos)", () => {
  it.each(PRICE_CASES)("faixas: %skm custa R$ %s", (km, price) => {
    expect(getFreightPrice(km, RANGES)).toBe(price);
  });

  it("sem faixas o preço é a combinar (null)", () => {
    expect(getFreightPrice(3, [])).toBeNull();
  });

  it.each(DISTANCE_CASES)("área de entrega: %j", ({ km, allowAboveMax, customMax, error }) => {
    expect(validateDistance(km, RANGES, allowAboveMax, customMax)?.error ?? null).toBe(error);
  });

  it.each(COMPUTE_CASES)("$name", ({ config, km, cart, expected }) => {
    expect(frontFreight(config as Config, km, cart)).toBe(expected);
  });

  it.each(DESTINATION_CASES)("destino enviado ao Google %j", (input, expected) => {
    expect(formatFreightDestinationAddress(input)).toBe(expected);
  });

  it.each(ORIGIN_CASES)("origem enviada ao Google %j", (input, expected) => {
    expect(buildOriginAddress(input)).toBe(expected);
  });
});
