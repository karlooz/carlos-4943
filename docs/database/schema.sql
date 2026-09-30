-- =============================================================================
-- Caracolandia · Propuesta de esquema de base de datos (PostgreSQL 16+)
-- -----------------------------------------------------------------------------
-- Documento de diseño: docs/database/propuesta-base-de-datos.md
--
-- Convenciones:
--   * Tablas en snake_case y plural; columnas en snake_case y singular.
--   * Llave primaria:  id  (UUID; SMALLINT identity en catálogos pequeños).
--   * Llave foránea:   <tabla_en_singular>_id  (p. ej. user_id -> users.id).
--   * Sufijos/prefijos por tipo:
--       _at      TIMESTAMPTZ (fecha y hora en UTC)     _date   DATE
--       _cents   BIGINT      (dinero en centavos)      is_     BOOLEAN
--       _code    códigos cortos                        status  VARCHAR + CHECK
--   * Restricciones con nombre: pk_, fk_, uq_, ck_ e índices ix_.
--   * Toda tabla transaccional tiene created_at; las mutables, updated_at.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext;   -- correos sin distinción de mayúsculas

-- -----------------------------------------------------------------------------
-- Usuarios y sesiones
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    full_name       VARCHAR(80)   NOT NULL,
    email           CITEXT        NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,          -- Argon2id codificado (incluye sal y parámetros)
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_full_name CHECK (char_length(btrim(full_name)) >= 3)
);

CREATE TABLE sessions (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL,
    token_hash      CHAR(64)      NOT NULL,          -- SHA-256 del token; el token solo viaja en cookie HttpOnly
    user_agent      VARCHAR(255),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ   NOT NULL,
    revoked_at      TIMESTAMPTZ,                     -- se llena al cerrar sesión
    CONSTRAINT pk_sessions PRIMARY KEY (id),
    CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_sessions_expiration CHECK (expires_at > created_at)
);

CREATE INDEX ix_sessions_user_id ON sessions (user_id);

-- -----------------------------------------------------------------------------
-- Monedero, pagos y movimientos
-- -----------------------------------------------------------------------------
CREATE TABLE wallets (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL,
    balance_cents   BIGINT        NOT NULL DEFAULT 0,  -- saldo vigente (cache del libro mayor)
    currency_code   CHAR(3)       NOT NULL DEFAULT 'MXN',
    version         INTEGER       NOT NULL DEFAULT 0,  -- bloqueo optimista
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_wallets PRIMARY KEY (id),
    CONSTRAINT uq_wallets_user_id UNIQUE (user_id),     -- relación 1:1 con users
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_wallets_balance CHECK (balance_cents >= 0)
);

CREATE TABLE payments (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    wallet_id           UUID          NOT NULL,
    idempotency_key     UUID          NOT NULL,        -- evita cobros duplicados en reintentos
    provider_payment_id UUID,                          -- "id" que devuelve SnailPay (NULL si hubo timeout)
    status              VARCHAR(20)   NOT NULL,
    status_detail       VARCHAR(60)   NOT NULL,
    amount_cents        BIGINT        NOT NULL,
    authorization_code  CHAR(6),                       -- solo cuando status = 'approved'
    reference           VARCHAR(30),
    payer_email         CITEXT        NOT NULL,
    card_last4          CHAR(4)       NOT NULL,        -- nunca número completo ni CVV (PCI DSS)
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_payments PRIMARY KEY (id),
    CONSTRAINT uq_payments_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT uq_payments_provider_payment_id UNIQUE (provider_payment_id),
    CONSTRAINT fk_payments_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE RESTRICT,
    CONSTRAINT ck_payments_status CHECK (status IN ('pending', 'approved', 'rejected', 'error')),
    CONSTRAINT ck_payments_amount CHECK (amount_cents > 0 AND amount_cents <= 1000000),
    CONSTRAINT ck_payments_authorization CHECK (
        (status = 'approved' AND authorization_code IS NOT NULL)
        OR (status <> 'approved' AND authorization_code IS NULL)
    ),
    CONSTRAINT ck_payments_card_last4 CHECK (card_last4 ~ '^[0-9]{4}$')
);

CREATE INDEX ix_payments_wallet_id_created_at ON payments (wallet_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Carreras, caracoles y apuestas
-- -----------------------------------------------------------------------------
CREATE TABLE snails (
    id              SMALLINT      GENERATED ALWAYS AS IDENTITY,
    name            VARCHAR(40)   NOT NULL,
    speed           SMALLINT      NOT NULL,
    color_hex       CHAR(7)       NOT NULL,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_snails PRIMARY KEY (id),
    CONSTRAINT uq_snails_name UNIQUE (name),
    CONSTRAINT ck_snails_speed CHECK (speed BETWEEN 1 AND 10),
    CONSTRAINT ck_snails_color_hex CHECK (color_hex ~ '^#[0-9a-fA-F]{6}$')
);

CREATE TABLE races (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    race_date       DATE          NOT NULL,
    race_number     SMALLINT      NOT NULL,
    scheduled_at    TIMESTAMPTZ   NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'scheduled',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    CONSTRAINT pk_races PRIMARY KEY (id),
    CONSTRAINT uq_races_date_number UNIQUE (race_date, race_number),
    CONSTRAINT ck_races_number CHECK (race_number BETWEEN 1 AND 6),
    CONSTRAINT ck_races_status CHECK (status IN ('scheduled', 'finished', 'cancelled'))
);

-- Tabla intermedia N:M entre races y snails (participantes y posición final).
CREATE TABLE race_entries (
    race_id         UUID          NOT NULL,
    snail_id        SMALLINT      NOT NULL,
    lane_number     SMALLINT      NOT NULL,
    final_position  SMALLINT,                          -- NULL hasta que termina la carrera
    CONSTRAINT pk_race_entries PRIMARY KEY (race_id, snail_id),
    CONSTRAINT fk_race_entries_race FOREIGN KEY (race_id) REFERENCES races (id) ON DELETE CASCADE,
    CONSTRAINT fk_race_entries_snail FOREIGN KEY (snail_id) REFERENCES snails (id) ON DELETE RESTRICT,
    CONSTRAINT uq_race_entries_lane UNIQUE (race_id, lane_number),
    CONSTRAINT uq_race_entries_position UNIQUE (race_id, final_position),  -- un solo 1.er lugar por carrera
    CONSTRAINT ck_race_entries_lane CHECK (lane_number BETWEEN 1 AND 6),
    CONSTRAINT ck_race_entries_position CHECK (final_position BETWEEN 1 AND 6)
);

CREATE INDEX ix_race_entries_snail_id ON race_entries (snail_id);

CREATE TABLE bets (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL,
    race_id         UUID          NOT NULL,
    snail_id        SMALLINT      NOT NULL,
    amount_cents    BIGINT        NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'pending',
    payout_cents    BIGINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    settled_at      TIMESTAMPTZ,
    CONSTRAINT pk_bets PRIMARY KEY (id),
    CONSTRAINT fk_bets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    -- FK compuesta: solo se puede apostar por un caracol que corre en esa carrera.
    CONSTRAINT fk_bets_race_entry FOREIGN KEY (race_id, snail_id)
        REFERENCES race_entries (race_id, snail_id) ON DELETE RESTRICT,
    CONSTRAINT ck_bets_amount CHECK (amount_cents > 0),
    CONSTRAINT ck_bets_status CHECK (status IN ('pending', 'won', 'lost', 'refunded')),
    CONSTRAINT ck_bets_payout CHECK (payout_cents >= 0)
);

CREATE INDEX ix_bets_user_id_created_at ON bets (user_id, created_at DESC);
CREATE INDEX ix_bets_race_id ON bets (race_id);

-- Libro mayor: todo cambio de saldo queda registrado y es auditable.
CREATE TABLE wallet_movements (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    wallet_id           UUID          NOT NULL,
    movement_type       VARCHAR(20)   NOT NULL,
    amount_cents        BIGINT        NOT NULL,        -- positivo = abono, negativo = cargo
    balance_after_cents BIGINT        NOT NULL,
    payment_id          UUID,                          -- origen: recarga
    bet_id              UUID,                          -- origen: apuesta o premio
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT pk_wallet_movements PRIMARY KEY (id),
    CONSTRAINT fk_wallet_movements_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE RESTRICT,
    CONSTRAINT fk_wallet_movements_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT,
    CONSTRAINT fk_wallet_movements_bet FOREIGN KEY (bet_id) REFERENCES bets (id) ON DELETE RESTRICT,
    CONSTRAINT uq_wallet_movements_payment_id UNIQUE (payment_id),     -- una recarga se abona una sola vez
    CONSTRAINT uq_wallet_movements_bet_type UNIQUE (bet_id, movement_type),
    CONSTRAINT ck_wallet_movements_type CHECK (movement_type IN ('top_up', 'bet_stake', 'bet_payout', 'bet_refund')),
    CONSTRAINT ck_wallet_movements_amount CHECK (amount_cents <> 0),
    CONSTRAINT ck_wallet_movements_balance CHECK (balance_after_cents >= 0),
    CONSTRAINT ck_wallet_movements_origin CHECK (
        (movement_type = 'top_up' AND payment_id IS NOT NULL AND bet_id IS NULL)
        OR (movement_type <> 'top_up' AND bet_id IS NOT NULL AND payment_id IS NULL)
    )
);

CREATE INDEX ix_wallet_movements_wallet_id_created_at ON wallet_movements (wallet_id, created_at DESC);
CREATE INDEX ix_wallet_movements_bet_id ON wallet_movements (bet_id);
