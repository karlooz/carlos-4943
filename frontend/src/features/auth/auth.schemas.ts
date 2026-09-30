import { z } from 'zod';

const NAME_PATTERN = /^[\p{L}][\p{L}' .-]*$/u;

const emailField = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio')
  .max(254, 'El correo es demasiado largo')
  .pipe(z.email('Ingresa un correo válido'));

export const PASSWORD_RULES = [
  { test: (value: string) => value.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (value: string) => /[a-z]/.test(value), label: 'Una letra minúscula' },
  { test: (value: string) => /[A-Z]/.test(value), label: 'Una letra mayúscula' },
  { test: (value: string) => /\d/.test(value), label: 'Un número' },
] as const;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(80, 'El nombre no debe exceder 80 caracteres')
      .regex(NAME_PATTERN, 'El nombre solo puede contener letras, espacios, apóstrofos o guiones'),
    email: emailField,
    password: z
      .string()
      .max(64, 'La contraseña no debe exceder 64 caracteres')
      .superRefine((value, ctx) => {
        const failed = PASSWORD_RULES.filter((rule) => !rule.test(value));
        if (failed.length > 0) {
          ctx.addIssue({
            code: 'custom',
            message: `La contraseña requiere: ${failed.map((rule) => rule.label.toLowerCase()).join(', ')}`,
          });
        }
      }),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type RegisterFormValues = z.input<typeof registerSchema>;
export type LoginFormValues = z.input<typeof loginSchema>;
