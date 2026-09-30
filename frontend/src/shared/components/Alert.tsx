import type { ReactNode } from 'react';

export type AlertTone = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  tone: AlertTone;
  title?: string;
  children: ReactNode;
}

const ICONS: Record<AlertTone, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

export function Alert({ tone, title, children }: AlertProps) {
  // Los errores se anuncian de inmediato a lectores de pantalla; el resto, de forma cortés.
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div className={`alert alert--${tone}`} role={role}>
      <span className="alert__icon" aria-hidden="true">
        {ICONS[tone]}
      </span>
      <div className="alert__body">
        {title && <p className="alert__title">{title}</p>}
        <div className="alert__content">{children}</div>
      </div>
    </div>
  );
}
