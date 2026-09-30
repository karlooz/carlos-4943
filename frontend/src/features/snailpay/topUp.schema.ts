import { z } from 'zod';
import { onlyDigits } from '../../shared/utils/cardFormat';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Validaciones de formato en el cliente para dar retroalimentación inmediata.
 * Las reglas de negocio (tarjeta vencida, límites, rechazos) las decide SnailPay.
 */
export const topUpSchema = z.object({
  cardNumber: z
    .string()
    .refine((value) => /^\d{16}$/.test(onlyDigits(value)) && /^[\d ]+$/.test(value), {
      message: 'El número de tarjeta debe tener 16 dígitos',
    }),
  expirationDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Usa el formato MM/AA con un mes válido'),
  cvv: z.string().regex(/^\d{3}$/, 'El CVV debe tener 3 dígitos'),
  cardholderName: z
    .string()
    .trim()
    .min(1, 'El nombre del titular es obligatorio')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  amount: z
    .string()
    .trim()
    .min(1, 'Ingresa el monto a recargar')
    .regex(AMOUNT_PATTERN, 'Ingresa un monto válido con máximo 2 decimales')
    .refine((value) => Number(value) > 0, 'El monto debe ser mayor que cero'),
});

export type TopUpFormValues = z.input<typeof topUpSchema>;
