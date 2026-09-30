import { describe, expect, it } from 'vitest';
import { formatCardNumber, formatExpirationDate, maskCardNumber } from './cardFormat';
import { formatCents, toCents } from './money';

describe('cardFormat', () => {
  it('agrupa el número de tarjeta en bloques de 4 y descarta caracteres no numéricos', () => {
    expect(formatCardNumber('1234-1234 1234abc12341234999')).toBe('1234 1234 1234 1234');
  });

  it('inserta la diagonal en la fecha de vencimiento', () => {
    expect(formatExpirationDate('1')).toBe('1');
    expect(formatExpirationDate('122')).toBe('12/2');
    expect(formatExpirationDate('12/26')).toBe('12/26');
  });

  it('enmascara todo excepto los últimos 4 dígitos', () => {
    expect(maskCardNumber('1234123412341234')).toBe('•••• 1234');
  });
});

describe('money', () => {
  it('convierte a centavos sin errores de redondeo', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1234.56)).toBe(123456);
  });

  it('formatea centavos como moneda', () => {
    expect(formatCents(123456)).toContain('1,234.56');
  });
});
