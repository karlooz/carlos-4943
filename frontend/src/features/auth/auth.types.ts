import { z } from 'zod';

export const passwordHashSchema = z.object({
  algorithm: z.literal('PBKDF2-SHA256'),
  iterations: z.number().int().positive(),
  salt: z.string().min(1),
  hash: z.string().min(1),
});

export const storedUserSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().min(1),
  password: passwordHashSchema,
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export type PasswordHash = z.infer<typeof passwordHashSchema>;
/** Usuario tal como se guarda en LocalStorage (incluye el hash de la contraseña). */
export type StoredUser = z.infer<typeof storedUserSchema>;
export type Session = z.infer<typeof sessionSchema>;

/** Usuario expuesto a la UI: nunca incluye información de la contraseña. */
export type User = Omit<StoredUser, 'password'>;

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
