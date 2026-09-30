import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

describe('loadConfig', () => {
  it('usa valores por defecto seguros', () => {
    const config = loadConfig({});

    expect(config.port).toBe(3001);
    expect(config.snailPay.simulateOutage).toBe(false);
    expect(config.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('usa API_PORT e ignora la variable genérica PORT', () => {
    expect(loadConfig({ PORT: '5173' }).port).toBe(3001);
    expect(loadConfig({ API_PORT: '4000' }).port).toBe(4000);
  });

  it('interpreta la simulación de caída y varios orígenes CORS', () => {
    const config = loadConfig({
      SNAILPAY_SIMULATE_OUTAGE: 'true',
      CORS_ORIGIN: 'http://a.test, http://b.test',
    });

    expect(config.snailPay.simulateOutage).toBe(true);
    expect(config.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('falla al arrancar con valores inválidos', () => {
    expect(() => loadConfig({ SNAILPAY_SIMULATE_OUTAGE: 'quizas' })).toThrow(
      /SNAILPAY_SIMULATE_OUTAGE/,
    );
  });
});
