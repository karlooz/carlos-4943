import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  SNAILPAY_SIMULATE_OUTAGE: booleanFromString,
  SNAILPAY_TIMEOUT_DELAY_MS: z.coerce.number().int().nonnegative().default(15_000),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  snailPay: {
    simulateOutage: boolean;
    timeoutDelayMs: number;
  };
}

/**
 * Lee y valida las variables de entorno. Falla rápido (al arrancar) si alguna es inválida,
 * en lugar de descubrir el problema en tiempo de ejecución.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida -> ${details}`);
  }

  const values = parsed.data;

  return {
    nodeEnv: values.NODE_ENV,
    port: values.API_PORT,
    corsOrigins: values.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    snailPay: {
      simulateOutage: values.SNAILPAY_SIMULATE_OUTAGE,
      timeoutDelayMs: values.SNAILPAY_TIMEOUT_DELAY_MS,
    },
  };
}
