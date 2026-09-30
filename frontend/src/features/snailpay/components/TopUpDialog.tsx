import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '../../../shared/components/Alert';
import type { AlertTone } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { TextField } from '../../../shared/components/TextField';
import {
  formatCardNumber,
  formatExpirationDate,
  onlyDigits,
} from '../../../shared/utils/cardFormat';
import { formatAmount } from '../../../shared/utils/money';
import type { User } from '../../auth/auth.types';
import { snailPayClient as defaultClient } from '../api/snailpayClient';
import type { SnailPayClient } from '../api/snailpayClient';
import { performTopUp } from '../services/topUpService';
import type { TopUpResult } from '../services/topUpService';
import { topUpSchema } from '../topUp.schema';
import type { TopUpFormValues } from '../topUp.schema';
import { TestCardsHint } from './TestCardsHint';

interface TopUpDialogProps {
  user: User;
  onClose: () => void;
  /** Se invoca después de cualquier respuesta de SnailPay para refrescar saldo e historial. */
  onCompleted: (result: TopUpResult) => void;
  client?: SnailPayClient;
}

const RESULT_PRESENTATION: Record<TopUpResult['kind'], { tone: AlertTone; title: string }> = {
  approved: { tone: 'success', title: 'Recarga aprobada' },
  rejected: { tone: 'error', title: 'Pago rechazado' },
  system_error: { tone: 'warning', title: 'SnailPay no pudo procesar el pago' },
  timeout: { tone: 'warning', title: 'Tiempo de espera agotado' },
  network_error: { tone: 'warning', title: 'Sin conexión con SnailPay' },
};

const EMPTY_FORM: TopUpFormValues = {
  cardNumber: '',
  expirationDate: '',
  cvv: '',
  cardholderName: '',
  amount: '',
};

export function TopUpDialog({
  user,
  onClose,
  onCompleted,
  client = defaultClient,
}: TopUpDialogProps) {
  const [result, setResult] = useState<TopUpResult | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TopUpFormValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: { ...EMPTY_FORM, cardholderName: user.fullName },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    const topUpResult = await performTopUp(client, user, {
      cardNumber: onlyDigits(values.cardNumber),
      expirationDate: values.expirationDate,
      cvv: values.cvv,
      cardholderName: values.cardholderName.trim(),
      amount: Number(values.amount),
    });
    setResult(topUpResult);
    onCompleted(topUpResult);
  });

  const presentation = result ? RESULT_PRESENTATION[result.kind] : null;

  return (
    <Modal
      title="Recargar saldo"
      description="Pago simulado con SnailPay. No uses datos reales."
      onClose={onClose}
      isDismissible={!isSubmitting}
    >
      {result && presentation && (
        <Alert tone={presentation.tone} title={presentation.title}>
          <p>{result.message}</p>
          {result.kind === 'approved' && (
            <p className="mono">
              {formatAmount(result.payment.transaction_amount ?? 0)} · Autorización{' '}
              {result.payment.authorization_code} · Ref. {result.payment.reference}
            </p>
          )}
          {(result.kind === 'rejected' || result.kind === 'system_error') && result.payment && (
            <p className="mono">Ref. {result.payment.reference}</p>
          )}
        </Alert>
      )}

      {result?.kind === 'approved' ? (
        <div className="modal__actions">
          <Button onClick={onClose}>Volver al dashboard</Button>
        </div>
      ) : (
        <form className="form" onSubmit={onSubmit} noValidate>
          <TextField
            label="Número de tarjeta"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1234 1234 1234 1234"
            maxLength={19}
            error={errors.cardNumber?.message}
            {...register('cardNumber', {
              onChange: (event: ChangeEvent<HTMLInputElement>) =>
                setValue('cardNumber', formatCardNumber(event.target.value)),
            })}
          />
          <div className="form__row">
            <TextField
              label="Vencimiento"
              inputMode="numeric"
              autoComplete="off"
              placeholder="MM/AA"
              maxLength={5}
              error={errors.expirationDate?.message}
              {...register('expirationDate', {
                onChange: (event: ChangeEvent<HTMLInputElement>) =>
                  setValue('expirationDate', formatExpirationDate(event.target.value)),
              })}
            />
            <TextField
              label="CVV"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="•••"
              maxLength={3}
              error={errors.cvv?.message}
              {...register('cvv')}
            />
          </div>
          <TextField
            label="Nombre del titular"
            autoComplete="off"
            error={errors.cardholderName?.message}
            {...register('cardholderName')}
          />
          <TextField
            label="Monto a recargar (MXN)"
            inputMode="decimal"
            placeholder="500.00"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <TestCardsHint />
          <div className="modal__actions">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting} loadingText="Procesando pago...">
              {result ? 'Reintentar pago' : 'Pagar con SnailPay'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
