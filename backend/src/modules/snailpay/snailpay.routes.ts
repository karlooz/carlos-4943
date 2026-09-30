import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createSnailPayController } from './snailpay.controller.js';
import type { SnailPayControllerDeps } from './snailpay.controller.js';

const PAYMENTS_RATE_LIMIT = { windowMs: 60_000, limit: 30 } as const;

export function createSnailPayRouter(deps: SnailPayControllerDeps): Router {
  const router = Router();
  const controller = createSnailPayController(deps);

  router.post(
    '/payments',
    rateLimit({ ...PAYMENTS_RATE_LIMIT, standardHeaders: 'draft-8', legacyHeaders: false }),
    controller.createPayment,
  );

  return router;
}
