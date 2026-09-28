function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function crc16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface GeneratePixPayloadOptions {
  key: string;
  keyType?: string | null;
  name?: string;
  city?: string;
  amount?: number;
  description?: string;
  txid?: string;
}

export function cleanPixKey(key: string, keyType?: string | null): string {
  if (!key) return '';
  const trimmed = key.trim();
  const typeUpper = (keyType || '').toUpperCase();

  if (trimmed.includes('@') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');

  if (
    typeUpper.includes('PHONE') ||
    typeUpper.includes('CELULAR') ||
    typeUpper.includes('TELEFONE') ||
    (digits.length >= 10 && digits.length <= 11)
  ) {
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    if (digits.length === 12 || digits.length === 13) {
      return `+${digits}`;
    }
  }

  if (digits.length === 11 || digits.length === 14) {
    return digits;
  }

  return trimmed;
}

export function generatePixPayload({
  key,
  keyType,
  name = 'LOJAPOD',
  city = 'SAO PAULO',
  amount,
  description,
  txid = '***',
}: GeneratePixPayloadOptions): string {
  const pixKey = cleanPixKey(key, keyType);
  if (!pixKey) return '';

  // 00 - Payload Format Indicator
  const payloadFormat = formatField('00', '01');

  // 26 - Merchant Account Information
  const gui = formatField('00', 'BR.GOV.BCB.PIX');
  const keyField = formatField('01', pixKey);
  const descField = description ? formatField('02', removeAccents(description).slice(0, 40)) : '';
  const merchantAccountInfo = formatField('26', `${gui}${keyField}${descField}`);

  // 52 - Merchant Category Code
  const mcc = formatField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  const currency = formatField('53', '986');

  // 54 - Transaction Amount
  let amountField = '';
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    amountField = formatField('54', formattedAmount);
  }

  // 58 - Country Code
  const countryCode = formatField('58', 'BR');

  // 59 - Merchant Name (max 25 chars)
  const cleanName =
    removeAccents(name)
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, 25) || 'LOJAPOD';
  const merchantName = formatField('59', cleanName);

  // 60 - Merchant City (max 15 chars)
  const cleanCity =
    removeAccents(city)
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, 15) || 'SAO PAULO';
  const merchantCity = formatField('60', cleanCity);

  // 62 - Additional Data Field Template (TxID)
  const cleanTxid = removeAccents(txid).replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const txidField = formatField('05', cleanTxid);
  const additionalData = formatField('62', txidField);

  // Concatenate string before CRC calculation
  const rawPayload = `${payloadFormat}${merchantAccountInfo}${mcc}${currency}${amountField}${countryCode}${merchantName}${merchantCity}${additionalData}6304`;

  // Calculate CRC16 checksum
  const checksum = crc16(rawPayload);

  return `${rawPayload}${checksum}`;
}
