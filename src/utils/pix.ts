const PIX_DOMAIN = "BR.GOV.BCB.PIX";
const DEFAULT_MERCHANT_NAME = "EVENTO";
const DEFAULT_MERCHANT_CITY = "BRASILIA";

const sanitizeString = (value: string, maxLength: number) => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return "";
  }

  return normalized.slice(0, maxLength);
};

const formatTLV = (id: string, value: string) => {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
};

const crc16 = (payload: string) => {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export const isEmvPixPayload = (payload: string) => {
  return /^000201/.test(payload.trim());
};

interface GeneratePixPayloadOptions {
  pixKey: string;
  merchantName?: string | null;
  merchantCity?: string | null;
  amount?: number | null;
  additionalInfo?: string | null;
}

export const generateStaticPixPayload = ({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  additionalInfo,
}: GeneratePixPayloadOptions) => {
  const sanitizedKey = pixKey.trim();
  if (!sanitizedKey) {
    return "";
  }

  const merchantInfo = formatTLV(
    "26",
    formatTLV("00", PIX_DOMAIN) + formatTLV("01", sanitizedKey)
  );

  const merchantNameValue =
    sanitizeString(merchantName || "", 25) || DEFAULT_MERCHANT_NAME;
  const merchantCityValue =
    sanitizeString(merchantCity || "", 15) || DEFAULT_MERCHANT_CITY;

  let payload =
    formatTLV("00", "01") +
    merchantInfo +
    formatTLV("52", "0000") +
    formatTLV("53", "986") +
    formatTLV("58", "BR") +
    formatTLV("59", merchantNameValue) +
    formatTLV("60", merchantCityValue);

  if (amount && amount > 0) {
    payload += formatTLV("54", amount.toFixed(2));
  }

  if (additionalInfo) {
    const infoValue = sanitizeString(additionalInfo, 25);
    if (infoValue) {
      payload += formatTLV("62", formatTLV("05", infoValue));
    }
  }

  payload += "6304";
  const crc = crc16(payload);
  return `${payload}${crc}`;
};

export const getPixPayloadForDisplay = ({
  rawPayload,
  merchantName,
  merchantCity,
}: {
  rawPayload: string;
  merchantName?: string | null;
  merchantCity?: string | null;
}) => {
  const trimmed = rawPayload.trim();
  if (!trimmed) {
    return {
      qrPayload: "",
      copyPayload: "",
      generatedFromKey: false,
    };
  }

  if (isEmvPixPayload(trimmed)) {
    return {
      qrPayload: trimmed,
      copyPayload: trimmed,
      generatedFromKey: false,
    };
  }

  const generated = generateStaticPixPayload({
    pixKey: trimmed,
    merchantName,
    merchantCity,
  });

  return {
    qrPayload: generated,
    copyPayload: generated || trimmed,
    generatedFromKey: !!generated,
  };
};

