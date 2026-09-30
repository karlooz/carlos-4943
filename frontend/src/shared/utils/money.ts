const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

/** Los saldos se guardan en centavos (enteros) para evitar errores de punto flotante. */
export const toCents = (amount: number): number => Math.round(amount * 100);

export const fromCents = (cents: number): number => cents / 100;

export const formatCents = (cents: number): string => currencyFormatter.format(fromCents(cents));

export const formatAmount = (amount: number): string => currencyFormatter.format(amount);
