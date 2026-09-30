import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { ROUTES } from '../../../routes';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { TextField } from '../../../shared/components/TextField';
import { loginSchema } from '../auth.schemas';
import type { LoginFormValues } from '../auth.schemas';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { InvalidCredentialsError } from '../services/authService';

export function LoginPage() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      // La redirección al dashboard la resuelve <PublicOnlyRoute> al detectar la sesión.
    } catch (error) {
      setFormError(
        error instanceof InvalidCredentialsError
          ? error.message
          : 'No fue posible iniciar sesión. Intenta de nuevo.',
      );
    }
  });

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Bienvenido de vuelta a la pista."
      footer={
        <>
          ¿Aún no tienes cuenta? <Link to={ROUTES.register}>Regístrate</Link>
        </>
      }
    >
      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting} loadingText="Verificando...">
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
