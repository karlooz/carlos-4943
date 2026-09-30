import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { ROUTES } from '../../../routes';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { TextField } from '../../../shared/components/TextField';
import { PASSWORD_RULES, registerSchema } from '../auth.schemas';
import type { RegisterFormValues } from '../auth.schemas';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { EmailAlreadyRegisteredError } from '../services/authService';

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="password-rules" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const isMet = rule.test(password);
        return (
          <li key={rule.label} className={isMet ? 'password-rules__item--met' : undefined}>
            <span aria-hidden="true">{isMet ? '✓' : '•'}</span> {rule.label}
            <span className="visually-hidden">{isMet ? ' (cumplido)' : ' (pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async ({ fullName, email, password: newPassword }) => {
    setFormError(null);
    try {
      await registerUser({ fullName, email, password: newPassword });
    } catch (error) {
      setFormError(
        error instanceof EmailAlreadyRegisteredError
          ? error.message
          : 'No fue posible crear la cuenta. Intenta de nuevo.',
      );
    }
  });

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empiezas con un saldo de $0.00 y puedes recargar cuando quieras."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to={ROUTES.login}>Inicia sesión</Link>
        </>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField
          label="Nombre completo"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          hint={<PasswordChecklist password={password} />}
          {...register('password')}
        />
        <TextField
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Creando cuenta...">
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
