import type { Request, Response } from 'express';
import type { SnailPayService } from './snailpay.service.js';

export interface SnailPayControllerDeps {
  service: SnailPayService;
  timeoutDelayMs: number;
  sleep: (ms: number) => Promise<void>;
}

export function createSnailPayController({
  service,
  timeoutDelayMs,
  sleep,
}: SnailPayControllerDeps) {
  async function createPayment(req: Request, res: Response): Promise<void> {
    const outcome = service.processCharge(req.body);

    if (outcome.simulateTimeout) {
      // Simula un procesador lento: el cliente debe cortar la espera con su propio timeout.
      await sleep(timeoutDelayMs);
    }

    res.status(outcome.httpStatus).json(outcome.body);
  }

  return { createPayment };
}
