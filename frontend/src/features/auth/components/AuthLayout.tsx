import type { ReactNode } from 'react';
import { BrandLogo } from '../../../shared/components/BrandLogo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <aside className="auth-layout__hero" aria-hidden="true">
        <BrandLogo size={44} />
        <p className="auth-layout__tagline">
          La pista más lenta y emocionante del mundo. Sigue a tus caracoles favoritos, revisa tus
          apuestas y recarga saldo en segundos.
        </p>
        <div className="auth-layout__track">
          <span className="auth-layout__snail">🐌</span>
          <span className="auth-layout__finish">🏁</span>
        </div>
      </aside>
      <main className="auth-layout__main">
        <div className="auth-card">
          <div className="auth-card__brand-mobile">
            <BrandLogo />
          </div>
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__subtitle">{subtitle}</p>
          {children}
          <footer className="auth-card__footer">{footer}</footer>
        </div>
      </main>
    </div>
  );
}
