export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** "1234123412341234" -> "1234 1234 1234 1234" (máx. 16 dígitos). */
export const formatCardNumber = (value: string): string =>
  onlyDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/** "1226" -> "12/26" mientras el usuario escribe. */
export const formatExpirationDate = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** Muestra solo los últimos 4 dígitos en la interfaz. */
export const maskCardNumber = (cardNumber: string): string =>
  `•••• ${onlyDigits(cardNumber).slice(-4)}`;
