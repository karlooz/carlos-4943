import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildPayment, TEST_USER } from '../../../test/fixtures';
import { getBalanceCents } from '../../wallet/services/walletService';
import type { SnailPayClient } from '../api/snailpayClient';
import type { ChargeAttempt } from '../snailpay.types';
import { TopUpDialog } from './TopUpDialog';

const renderDialog = (attempt: ChargeAttempt) => {
  const client: SnailPayClient = { charge: vi.fn().mockResolvedValue(attempt) };
  const onCompleted = vi.fn();
  render(
    <TopUpDialog user={TEST_USER} onClose={vi.fn()} onCompleted={onCompleted} client={client} />,
  );
  return { client, onCompleted };
};

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Número de tarjeta'), '1234123412341234');
  await user.type(screen.getByLabelText('Vencimiento'), '1226');
  await user.type(screen.getByLabelText('CVV'), '543');
  await user.type(screen.getByLabelText('Monto a recargar (MXN)'), '150.50');
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Pagar con SnailPay' }));

describe('TopUpDialog', () => {
  it('enfoca el número de tarjeta al abrir', () => {
    renderDialog({ kind: 'timeout' });

    expect(screen.getByLabelText('Número de tarjeta')).toHaveFocus();
  });

  it('formatea la tarjeta, envía los datos del usuario y confirma la aprobación', async () => {
    const user = userEvent.setup();
    const { client, onCompleted } = renderDialog({
      kind: 'response',
      httpStatus: 201,
      payment: buildPayment(),
    });

    await fillForm(user);
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('1234 1234 1234 1234');
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('12/26');
    await submit(user);

    expect(client.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        cardNumber: '1234123412341234',
        expirationDate: '12/26',
        amount: 150.5,
        payerId: TEST_USER.id,
        payerEmail: TEST_USER.email,
      }),
    );
    expect(await screen.findByText('Recarga aprobada')).toBeInTheDocument();
    expect(onCompleted).toHaveBeenCalledWith(expect.objectContaining({ kind: 'approved' }));
    expect(getBalanceCents(TEST_USER.id)).toBe(15050);
  });

  it('muestra un mensaje comprensible cuando la tarjeta es rechazada', async () => {
    const user = userEvent.setup();
    renderDialog({
      kind: 'response',
      httpStatus: 402,
      payment: buildPayment({
        status: 'rejected',
        status_detail: 'cc_rejected_insufficient_funds',
        authorization_code: null,
      }),
    });

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('Pago rechazado')).toBeInTheDocument();
    expect(screen.getByText('La tarjeta no tiene fondos suficientes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar pago' })).toBeInTheDocument();
    expect(getBalanceCents(TEST_USER.id)).toBe(0);
  });

  it('no llama a SnailPay si el formulario es inválido', async () => {
    const user = userEvent.setup();
    const { client } = renderDialog({ kind: 'timeout' });

    await submit(user);

    expect(
      await screen.findByText('El número de tarjeta debe tener 16 dígitos'),
    ).toBeInTheDocument();
    expect(client.charge).not.toHaveBeenCalled();
  });
});
