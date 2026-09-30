import { createContext } from 'react';
import type { LoginInput, RegisterInput, User } from '../auth.types';

export interface AuthContextValue {
  user: User | null;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
