import { z } from 'zod';
import { appConfig } from '../../../config';
import { STORAGE_KEYS, readJson, removeItem, writeJson } from '../../../shared/storage/storage';
import { sessionSchema, storedUserSchema } from '../auth.types';
import type { LoginInput, RegisterInput, Session, StoredUser, User } from '../auth.types';
import { DEFAULT_PBKDF2_ITERATIONS, hashPassword, verifyPassword } from './passwordHasher';

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Ya existe una cuenta registrada con este correo.');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    // Mensaje genérico: no revela si el correo existe o no.
    super('Correo o contraseña incorrectos.');
    this.name = 'InvalidCredentialsError';
  }
}

const usersSchema = z.array(storedUserSchema);

export interface AuthServiceOptions {
  now?: () => Date;
  sessionDurationMs?: number;
  hashIterations?: number;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const toPublicUser = ({ password: _password, ...user }: StoredUser): User => user;

export function createAuthService(options: AuthServiceOptions = {}) {
  const now = options.now ?? (() => new Date());
  const sessionDurationMs = options.sessionDurationMs ?? appConfig.sessionDurationMs;
  const hashIterations = options.hashIterations ?? DEFAULT_PBKDF2_ITERATIONS;

  const readUsers = (): StoredUser[] => readJson(STORAGE_KEYS.users, usersSchema, []);

  const findUserByEmail = (email: string): StoredUser | undefined =>
    readUsers().find((user) => user.email === normalizeEmail(email));

  function startSession(userId: string): Session {
    const createdAt = now();
    const session: Session = {
      userId,
      token: crypto.randomUUID(),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + sessionDurationMs).toISOString(),
    };
    writeJson(STORAGE_KEYS.session, session);
    return session;
  }

  async function register(input: RegisterInput): Promise<User> {
    const email = normalizeEmail(input.email);
    if (findUserByEmail(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const user: StoredUser = {
      id: crypto.randomUUID(),
      fullName: input.fullName.trim(),
      email,
      password: await hashPassword(input.password, hashIterations),
      createdAt: now().toISOString(),
    };

    writeJson(STORAGE_KEYS.users, [...readUsers(), user]);
    startSession(user.id);
    return toPublicUser(user);
  }

  async function login(input: LoginInput): Promise<User> {
    const user = findUserByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.password))) {
      throw new InvalidCredentialsError();
    }

    startSession(user.id);
    return toPublicUser(user);
  }

  function logout(): void {
    removeItem(STORAGE_KEYS.session);
  }

  /** Devuelve el usuario de la sesión activa, o `null` si no hay sesión válida y vigente. */
  function getCurrentUser(): User | null {
    const session = readJson(STORAGE_KEYS.session, sessionSchema.nullable(), null);
    if (!session) return null;

    const isExpired = new Date(session.expiresAt).getTime() <= now().getTime();
    const user = readUsers().find((candidate) => candidate.id === session.userId);

    if (isExpired || !user) {
      logout();
      return null;
    }

    return toPublicUser(user);
  }

  return { register, login, logout, getCurrentUser };
}

export type AuthService = ReturnType<typeof createAuthService>;

export const authService = createAuthService();
