import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { createSnailPayRouter } from './modules/snailpay/snailpay.routes.js';
import { createSnailPayService } from './modules/snailpay/snailpay.service.js';
import type { SnailPayServiceOptions } from './modules/snailpay/snailpay.service.js';
import { sleep as defaultSleep } from './utils/sleep.js';

export interface AppDependencies {
  config: AppConfig;
  /** Permite a las pruebas evitar esperas reales en el escenario de timeout. */
  sleep?: (ms: number) => Promise<void>;
  now?: SnailPayServiceOptions['now'];
}

export function createApp({ config, sleep = defaultSleep, now }: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST'] }));
  app.use(express.json({ limit: '10kb' }));
  if (config.nodeEnv !== 'test') {
    app.use(requestLogger);
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', snailpay_outage_simulated: config.snailPay.simulateOutage });
  });

  const snailPayService = createSnailPayService({
    simulateOutage: config.snailPay.simulateOutage,
    ...(now ? { now } : {}),
  });

  app.use(
    '/api/snailpay',
    createSnailPayRouter({
      service: snailPayService,
      timeoutDelayMs: config.snailPay.timeoutDelayMs,
      sleep,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
