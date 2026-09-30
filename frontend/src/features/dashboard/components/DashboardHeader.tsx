import { BrandLogo } from '../../../shared/components/BrandLogo';
import { Button } from '../../../shared/components/Button';

interface DashboardHeaderProps {
  fullName: string;
  onLogout: () => void;
}

const getInitials = (fullName: string): string =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export function DashboardHeader({ fullName, onLogout }: DashboardHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <BrandLogo />
        <div className="topbar__user">
          <span className="avatar" aria-hidden="true">
            {getInitials(fullName)}
          </span>
          <span className="topbar__name">{fullName}</span>
          <Button variant="secondary" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </header>
  );
}
