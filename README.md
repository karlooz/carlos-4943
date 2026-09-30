# 🐌 Caracolandia

Aplicación web de **apuestas simuladas en carreras de caracoles**. Permite registrarse, iniciar y
cerrar sesión, consultar un dashboard con estadísticas simuladas y **recargar saldo** a través de
**SnailPay**, una pasarela de pagos _mock_ construida en Express.

> Proyecto demostrativo: no procesa dinero ni datos financieros reales.

---

## Tabla de contenido

1. [Stack tecnológico](#stack-tecnológico)
2. [Requisitos previos](#requisitos-previos)
3. [Instalación y ejecución](#instalación-y-ejecución)
4. [Scripts disponibles](#scripts-disponibles)
5. [Variables de entorno](#variables-de-entorno)
6. [Cómo funciona](#cómo-funciona)
7. [API de SnailPay](#api-de-snailpay)
8. [Cómo reproducir cada respuesta de SnailPay](#cómo-reproducir-cada-respuesta-de-snailpay)
9. [Pruebas automatizadas](#pruebas-automatizadas)
10. [Estructura del proyecto](#estructura-del-proyecto)
11. [Estándares de código y buenas prácticas](#estándares-de-código-y-buenas-prácticas)
12. [Seguridad: decisiones y limitaciones](#seguridad-decisiones-y-limitaciones)
13. [Estado del proyecto](#estado-del-proyecto)
14. [Propuesta de base de datos](#propuesta-de-base-de-datos)
15. [Herramientas, librerías y uso de IA](#herramientas-librerías-y-uso-de-ia)

---

## Stack tecnológico

| Capa          | Tecnología                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| Frontend      | React 19 + TypeScript + Vite                                                  |
| Ruteo         | React Router 7                                                                |
| Formularios   | React Hook Form + Zod (validación)                                            |
| Gráficas      | Recharts (donut y barras)                                                     |
| Backend       | Express 5 + TypeScript                                                        |
| Seguridad API | Helmet, CORS restringido, límite de tamaño de cuerpo, rate limiting           |
| Persistencia  | `localStorage` (usuario, sesión, saldo e historial de pagos)                  |
| Pruebas       | Vitest, Testing Library (frontend), Supertest (backend)                       |
| Calidad       | ESLint (typescript-eslint, react-hooks), Prettier, EditorConfig, TS `strict`  |
| Monorepo      | npm workspaces (`backend/` y `frontend/`), `concurrently` para levantar ambos |

## Requisitos previos

- **Node.js 20.12 o superior** (probado con Node 24). Hay un `.nvmrc` con la versión sugerida.
- **npm 10 o superior**.

## Instalación y ejecución

```bash
# 1. Instalar dependencias de ambos workspaces (desde la raíz)
npm install

# 2. (Opcional) Crear archivos .env a partir de los ejemplos
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Levantar backend y frontend en modo desarrollo
npm run dev
```

| Servicio        | URL                              |
| --------------- | -------------------------------- |
| Frontend (Vite) | http://localhost:5173            |
| API (Express)   | http://localhost:3001            |
| Health check    | http://localhost:3001/api/health |

En desarrollo, Vite hace _proxy_ de `/api` hacia `http://localhost:3001`, por lo que el frontend
no necesita configurar CORS ni URLs absolutas.

### Ejecutar cada parte por separado

```bash
npm run dev -w backend     # solo API (recarga automática con tsx watch)
npm run dev -w frontend    # solo frontend
```

### Build de producción

```bash
npm run build              # compila backend (tsc) y frontend (vite build)
npm run start              # inicia la API compilada desde backend/dist
npm run preview -w frontend  # sirve el build del frontend
```

## Scripts disponibles

Todos se ejecutan desde la raíz del repositorio:

| Script              | Descripción                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | Levanta backend y frontend en paralelo.                               |
| `npm run build`     | Compila ambos proyectos.                                              |
| `npm test`          | Ejecuta todas las pruebas (backend y frontend).                       |
| `npm run typecheck` | Verifica tipos de TypeScript en ambos proyectos.                      |
| `npm run lint`      | Analiza el código con ESLint.                                         |
| `npm run format`    | Formatea el código con Prettier.                                      |
| `npm run validate`  | Formato + lint + tipos + pruebas (lo que correría un pipeline de CI). |

## Variables de entorno

### Backend (`backend/.env`)

| Variable                    | Default                 | Descripción                                                                                                                        |
| --------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `API_PORT`                  | `3001`                  | Puerto de la API. Se usa `API_PORT` (y no `PORT`) para no chocar con el puerto del frontend cuando ambos corren con `npm run dev`. |
| `CORS_ORIGIN`               | `http://localhost:5173` | Orígenes permitidos, separados por coma.                                                                                           |
| `SNAILPAY_SIMULATE_OUTAGE`  | `false`                 | `true` simula que SnailPay está caído: **todas** las recargas responden 503.                                                       |
| `SNAILPAY_TIMEOUT_DELAY_MS` | `15000`                 | Retardo que aplica la tarjeta de prueba de _timeout_.                                                                              |

La configuración se valida con Zod al arrancar: si un valor es inválido, el servidor no inicia y
muestra qué variable está mal.

### Frontend (`frontend/.env`)

| Variable                   | Default | Descripción                                                       |
| -------------------------- | ------- | ----------------------------------------------------------------- |
| `VITE_API_BASE_URL`        | _vacío_ | URL base de la API. Vacío = mismo origen (usa el proxy de Vite).  |
| `VITE_SNAILPAY_TIMEOUT_MS` | `8000`  | Tiempo máximo que el frontend espera a SnailPay antes de abortar. |

## Cómo funciona

### 1. Registro e inicio de sesión (simulación local)

- **Registro:** nombre completo, correo, contraseña y confirmación. Validaciones con Zod:
  - Nombre: 3–80 caracteres, solo letras (con acentos), espacios, apóstrofos o guiones.
  - Correo: formato válido, se normaliza a minúsculas y sin espacios; no se permiten duplicados.
  - Contraseña: 8–64 caracteres con al menos una minúscula, una mayúscula y un número
    (se muestra una lista de requisitos en tiempo real).
  - Confirmación: debe coincidir.
- **Contraseña:** nunca se guarda en texto plano. Se deriva con **PBKDF2-SHA256 (600,000
  iteraciones, sal aleatoria de 16 bytes)** usando Web Crypto, y se compara en tiempo constante.
  El algoritmo y las iteraciones se guardan junto al hash para poder endurecerlos en el futuro.
- **Login:** el error es genérico ("Correo o contraseña incorrectos") para no revelar qué
  correos están registrados.
- **Sesión:** se guarda en `localStorage` con un token aleatorio y expiración de 8 horas. Al
  recargar la página se restaura automáticamente; si expiró, se elimina.
- **Rutas protegidas:** `/dashboard` solo es accesible con sesión activa (`ProtectedRoute`); con
  sesión, `/login` y `/registro` redirigen al dashboard (`PublicOnlyRoute`).
- **Multi-pestaña:** si se cierra sesión en una pestaña, las demás se actualizan (evento `storage`).
- Cada usuario nuevo inicia con **saldo $0.00**.

### 2. Dashboard

Muestra el nombre del usuario, su saldo, la opción de recargar con SnailPay, cerrar sesión y:

- **Gráfica donut** de apuestas ganadas vs. perdidas del día.
- **Gráfica de barras** de victorias por caracol.
- **Resultados de las 6 carreras** del día y **últimas recargas**.

Los datos de carreras y apuestas son **simulados pero congruentes**:

- Hay **6 caracoles**, cada uno con una "velocidad" que define su probabilidad de ganar.
- Se corren **6 carreras** por día y cada una tiene **exactamente un ganador**, así que la suma de
  las barras siempre es 6.
- El usuario tiene de 1 a 3 apuestas por carrera; una apuesta es ganada **si y solo si** eligió al
  ganador de esa carrera. Así, el donut y la lista de carreras siempre cuadran.
- La simulación usa un generador pseudoaleatorio con semilla `usuario + fecha`: el "día simulado"
  no cambia al recargar la página, pero sí cambia de un día a otro y entre usuarios.
- Las apuestas simuladas **no afectan el saldo real**; el saldo solo cambia con recargas aprobadas.

### 3. Recarga de saldo con SnailPay

1. El usuario captura tarjeta, vencimiento (MM/AA), CVV, titular y monto. El formulario valida el
   formato y da formato automático a la tarjeta (`1234 1234 1234 1234`) y la fecha (`12/26`).
2. El frontend envía la petición a `POST /api/snailpay/payments` incluyendo el **id** y **correo**
   del usuario registrado (`payer_id`, `payer_email`).
3. La respuesta se valida contra el contrato con Zod. El saldo **solo** se acredita si todo es
   consistente: HTTP 201, `status = approved`, código de autorización presente, monto igual al
   solicitado y `payer_id` igual al usuario. Cualquier otra cosa se trata como fallo y **el saldo
   no se modifica** (no hay falsos cobros exitosos).
4. La acreditación es **idempotente** por id de operación: la misma respuesta nunca suma dos veces.
5. El nuevo saldo se guarda en `localStorage` y el dashboard se actualiza de inmediato.
6. Cada respuesta de SnailPay (aprobada, rechazada o error) se guarda en el historial, incluyendo
   número de tarjeta y CVV, tal como lo pide el requerimiento (siempre datos ficticios). En la
   interfaz la tarjeta se muestra enmascarada (`•••• 1234`).

Desenlaces que maneja el frontend y mensaje que ve el usuario:

| Desenlace         | Causa                                        | Saldo       |
| ----------------- | -------------------------------------------- | ----------- |
| Aprobada          | HTTP 201 + respuesta consistente             | Aumenta     |
| Rechazada         | HTTP 400 / 402 (datos inválidos o tarjeta)   | Sin cambios |
| Error del sistema | HTTP 503 / 504 o respuesta fuera de contrato | Sin cambios |
| Tiempo agotado    | Sin respuesta en `VITE_SNAILPAY_TIMEOUT_MS`  | Sin cambios |
| Sin conexión      | Error de red (API apagada, sin internet)     | Sin cambios |

Mientras el pago está en proceso, el botón muestra un indicador de carga y el modal no se puede
cerrar, evitando dobles envíos.

### Datos guardados en `localStorage`

| Llave                       | Contenido                                                                    |
| --------------------------- | ---------------------------------------------------------------------------- |
| `caracolandia:users`        | Usuarios registrados: id, nombre, correo, **hash** de contraseña, fecha.     |
| `caracolandia:session`      | Sesión activa: id de usuario, token, fecha de creación y expiración.         |
| `caracolandia:wallets`      | Saldo por usuario, en **centavos** (entero) para evitar errores de redondeo. |
| `caracolandia:transactions` | Respuestas de SnailPay por usuario (incluye tarjeta y CVV ficticios).        |

Todo lo que se lee de `localStorage` se valida con Zod; si un valor fue alterado o está corrupto,
se ignora en lugar de romper la aplicación.

## API de SnailPay

### `POST /api/snailpay/payments`

**Cuerpo de la petición** (JSON, snake_case):

| Campo                | Tipo   | Regla                                |
| -------------------- | ------ | ------------------------------------ |
| `card_number`        | string | Exactamente 16 dígitos               |
| `expiration_date`    | string | `MM/AA`, mes 01–12                   |
| `cvv`                | string | Exactamente 3 dígitos                |
| `cardholder_name`    | string | No vacío, máx. 100 caracteres        |
| `transaction_amount` | number | Mayor que 0, máximo 2 decimales      |
| `payer_id`           | string | Id del usuario registrado            |
| `payer_email`        | string | Correo válido del usuario registrado |

**Respuesta** (mismo contrato para éxito, error de transacción y error del sistema):

| Campo                | Tipo           | Descripción                                                       |
| -------------------- | -------------- | ----------------------------------------------------------------- |
| `id`                 | string (UUID)  | Identificador de la operación.                                    |
| `status`             | string         | `approved` · `rejected` · `error`.                                |
| `status_detail`      | string         | Detalle del resultado (ver tabla de escenarios).                  |
| `transaction_amount` | number \| null | Monto solicitado (`null` si no se envió un número válido).        |
| `date_created`       | string         | Fecha ISO 8601 (UTC).                                             |
| `authorization_code` | string \| null | Código de 6 caracteres; solo cuando `status = approved`.          |
| `reference`          | string         | `SP-AAAAMMDD-XXXXXXXX` (fecha + primeros 8 caracteres del id).    |
| `payer_id`           | string \| null | Id del usuario.                                                   |
| `payer_email`        | string \| null | Correo del usuario.                                               |
| `card_number`        | string \| null | Número de tarjeta enviado (ficticio).                             |
| `cvv`                | string \| null | CVV enviado (ficticio).                                           |
| `errors`             | array          | Solo en HTTP 400: lista `{ field, message }` de campos inválidos. |

**Códigos HTTP:** `201` aprobado · `400` datos inválidos · `402` rechazo de la transacción ·
`503` error del sistema · `504` timeout de procesamiento.

Ejemplo de respuesta aprobada:

```json
{
  "id": "6ed3b956-c9a1-4d37-b6b9-a63febd2741a",
  "status": "approved",
  "status_detail": "accredited",
  "transaction_amount": 250.5,
  "date_created": "2026-09-29T16:40:24.651Z",
  "authorization_code": "LDPX7G",
  "reference": "SP-20260929-6ED3B956",
  "payer_id": "user-1",
  "payer_email": "ana@example.com",
  "card_number": "1234123412341234",
  "cvv": "543"
}
```

### Otros endpoints

- `GET /api/health` → `{ "status": "ok", "snailpay_outage_simulated": false }`

## Cómo reproducir cada respuesta de SnailPay

Todos los datos son **ficticios**. Cuando no se indica, usa cualquier nombre no vacío, un monto
válido (p. ej. `100`) y una fecha de vencimiento futura (p. ej. `12/30`). Desde la interfaz, el
modal de recarga incluye el enlace "Ver tarjetas de prueba" con esta misma información.

| #   | Tarjeta            | Vencimiento                 | CVV        | Monto               | HTTP | `status`   | `status_detail`                                                                                                                          |
| --- | ------------------ | --------------------------- | ---------- | ------------------- | ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `1234123412341234` | `12/26`                     | `543`      | > 0                 | 201  | `approved` | `accredited`                                                                                                                             |
| 2   | `1234123412341234` | `12/26`                     | ≠ 543      | > 0                 | 402  | `rejected` | `cc_rejected_bad_security_code`                                                                                                          |
| 3   | `1234123412341234` | futura ≠ `12/26`            | `543`      | > 0                 | 402  | `rejected` | `cc_rejected_bad_expiration_date`                                                                                                        |
| 4   | `4000000000000002` | futura                      | cualquiera | > 0                 | 402  | `rejected` | `cc_rejected_insufficient_funds`                                                                                                         |
| 5   | `4000000000000119` | futura                      | cualquiera | > 0                 | 402  | `rejected` | `cc_rejected_high_risk`                                                                                                                  |
| 6   | cualquier otra     | **pasada** (p. ej. `01/24`) | cualquiera | > 0                 | 402  | `rejected` | `cc_rejected_card_expired`                                                                                                               |
| 7   | cualquier otra     | futura                      | cualquiera | > 0                 | 402  | `rejected` | `cc_rejected_card_declined`                                                                                                              |
| 8   | cualquiera         | cualquiera                  | cualquiera | > `10000`           | 402  | `rejected` | `cc_rejected_amount_limit_exceeded`                                                                                                      |
| 9   | `5000000000000001` | cualquiera                  | cualquiera | > 0                 | 503  | `error`    | `snailpay_service_unavailable`                                                                                                           |
| 10  | `5000000000000019` | cualquiera                  | cualquiera | > 0                 | 504* | `error`    | `snailpay_processing_timeout`                                                                                                            |
| 11  | formato inválido   | —                           | —          | ≤ 0 o > 2 decimales | 400  | `rejected` | `invalid_card_number`, `invalid_expiration_date`, `invalid_security_code`, `invalid_cardholder_name`, `invalid_amount` o `invalid_payer` |

\* El servidor espera `SNAILPAY_TIMEOUT_DELAY_MS` (15 s) antes de responder. Como el frontend
aborta a los 8 s, en la interfaz se ve el mensaje **"Tiempo de espera agotado"** y el saldo no
cambia.

> **Nota sobre la tarjeta aprobada:** la combinación exacta `1234123412341234` + `12/26` + `543`
> siempre se aprueba, incluso después de diciembre de 2026, para que la prueba sea reproducible.

### Simular una caída completa de SnailPay (error del sistema)

Además de la tarjeta #9, se puede simular que el servicio está caído para **todas** las
peticiones, incluso con la tarjeta aprobada:

```bash
# Opción A: en backend/.env
SNAILPAY_SIMULATE_OUTAGE=true

# Opción B: al arrancar (PowerShell)
$env:SNAILPAY_SIMULATE_OUTAGE="true"; npm run dev

# Opción B: al arrancar (bash)
SNAILPAY_SIMULATE_OUTAGE=true npm run dev
```

Con esto, cualquier recarga válida responde `503` con `status: "error"` y
`status_detail: "snailpay_service_unavailable"`, y **no se aplica ninguna recarga**.
`GET /api/health` indica si la caída simulada está activa.

### Probar con curl

```bash
curl -X POST http://localhost:3001/api/snailpay/payments \
  -H "Content-Type: application/json" \
  -d '{"card_number":"1234123412341234","expiration_date":"12/26","cvv":"543","cardholder_name":"Ana Pérez","transaction_amount":250.5,"payer_id":"user-1","payer_email":"ana@example.com"}'
```

## Pruebas automatizadas

```bash
npm test                      # todas las pruebas
npm run test -w backend       # solo backend
npm run test -w frontend      # solo frontend
npm run test:coverage -w backend   # con reporte de cobertura (igual para frontend)
```

**Backend (Vitest + Supertest):**

- `snailpay.service.test.ts`: cada escenario de la tabla anterior (aprobado, cada rechazo, cada
  validación, caída simulada, timeout) y la lógica de vencimiento de tarjetas con reloj inyectado.
  Verifica que **ningún** escenario de error devuelva código de autorización.
- `snailpay.routes.test.ts`: la API real (Express) con los códigos HTTP del contrato, que todas
  las respuestas incluyan los campos requeridos, JSON mal formado y rutas inexistentes.
- `env.test.ts`: la configuración falla rápido con valores inválidos e ignora `PORT` genérico.

**Frontend (Vitest + Testing Library + jsdom):**

- `passwordHasher.test.ts`: la contraseña no se guarda en claro, la verificación funciona y la
  sal hace que dos hashes de la misma contraseña sean distintos.
- `authService.test.ts`: registro, correo duplicado, login correcto/incorrecto con mensaje
  genérico, logout, persistencia de sesión, expiración y datos corruptos.
- `auth.schemas.test.ts`: validaciones del formulario de registro.
- `snailpayClient.test.ts`: traducción de cada desenlace HTTP (respuesta, contrato inválido,
  HTML en vez de JSON, error de red y **timeout con `AbortController`**).
- `topUpService.test.ts`: la regla más importante del negocio → **el saldo solo cambia con un
  cobro aprobado y consistente**; se prueba cada tipo de fallo, respuestas "aprobadas" sospechosas
  (monto, pagador o HTTP distintos) y la idempotencia.
- `raceDaySimulation.test.ts`: congruencia de datos (suma de victorias = carreras, apuesta
  ganada ⇔ caracol ganador, 6 caracoles siempre presentes, determinismo).
- `App.test.tsx`: flujo completo en la UI → redirección sin sesión, validaciones, registro,
  dashboard con saldo $0, cierre de sesión, nuevo inicio de sesión y persistencia al recargar.
- `TopUpDialog.test.tsx`: formateo de campos, envío de los datos del usuario, mensajes de
  aprobación/rechazo y que no se llame a SnailPay con un formulario inválido.

**¿Por qué estas pruebas?** Se priorizó lo que tendría mayor impacto si fallara: dinero (saldo que
cambia sin un cobro real), seguridad (contraseñas), el contrato de la integración y los requisitos
mínimos de validez (registro → logout → login → pantalla protegida).

> En las pruebas se usan 1,000 iteraciones de PBKDF2 (inyectadas) para que sean rápidas; la
> aplicación usa 600,000.

## Estructura del proyecto

```
.
├── backend/                         # API Express + SnailPay
│   ├── src/
│   │   ├── config/env.ts            # Variables de entorno validadas con Zod
│   │   ├── middlewares/             # Manejo de errores y log de acceso
│   │   ├── modules/snailpay/        # Módulo de pagos
│   │   │   ├── snailpay.constants.ts   # Tarjetas de prueba, límites y status_detail
│   │   │   ├── snailpay.schema.ts      # Validación del request
│   │   │   ├── snailpay.service.ts     # Reglas de negocio (puras, testeables)
│   │   │   ├── snailpay.controller.ts  # Adaptador HTTP
│   │   │   ├── snailpay.routes.ts      # Router + rate limit
│   │   │   └── snailpay.types.ts       # Contratos
│   │   ├── utils/
│   │   ├── app.ts                   # createApp(): composición con inyección de dependencias
│   │   └── index.ts                 # Arranque del servidor
│   └── tests/
├── frontend/                        # SPA React
│   └── src/
│       ├── features/                # Organización por funcionalidad
│       │   ├── auth/                # Registro, login, sesión, guards de rutas
│       │   ├── dashboard/           # Página y componentes del dashboard
│       │   ├── races/               # Simulación de carreras y gráficas
│       │   ├── snailpay/            # Cliente HTTP, orquestación de recargas y modal
│       │   └── wallet/              # Saldo e historial en localStorage
│       ├── shared/                  # Componentes UI, storage tipado y utilidades
│       ├── styles/global.css        # Tokens de diseño y estilos
│       ├── test/                    # Setup y fixtures de pruebas
│       ├── App.tsx                  # Definición de rutas
│       └── main.tsx
├── docs/database/                   # Propuesta de base de datos (diseño + DDL)
├── eslint.config.mjs · .prettierrc.json · .editorconfig
└── package.json                     # Workspaces y scripts globales
```

Separación de responsabilidades:

- **Backend:** `routes → controller → service`. El servicio no conoce Express (recibe datos y
  devuelve un resultado), por eso se prueba sin levantar servidor. El reloj, el generador de ids
  y la espera del timeout se inyectan para tener pruebas deterministas.
- **Frontend:** `componentes (UI) → hooks → services (lógica) → storage/api (I/O)`. Los componentes
  no acceden a `localStorage` ni a `fetch` directamente.

## Estándares de código y buenas prácticas

- **TypeScript estricto** en ambos proyectos (`strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`). Sin `any`.
- **Validación en los bordes:** entradas de formularios, cuerpo de peticiones, variables de entorno,
  respuestas de la API y datos leídos de `localStorage` se validan con Zod.
- **Convenciones de nombres:** componentes en `PascalCase`, hooks `useX`, servicios y utilidades
  en `camelCase`, constantes en `UPPER_SNAKE_CASE`; archivos de módulo con sufijo de su rol
  (`*.service.ts`, `*.schema.ts`, `*.types.ts`). El contrato HTTP usa `snake_case`.
- **ESLint + Prettier + EditorConfig** con fin de línea LF; `npm run validate` agrupa todas las
  verificaciones.
- **Manejo de errores explícito:** el cliente HTTP nunca lanza excepciones, devuelve una unión
  discriminada (`response | timeout | network_error | invalid_response`) que obliga a manejar cada
  caso.
- **Dinero en centavos** (enteros) para evitar errores de punto flotante.
- **Accesibilidad:** etiquetas asociadas a los campos, `aria-invalid`/`aria-describedby` en
  errores, alertas con `role="alert"`, modal con `aria-modal`, cierre con Escape, gestión de foco,
  descripciones alternativas en las gráficas y respeto a `prefers-reduced-motion`.
- **Diseño responsivo** y modo oscuro automático (`prefers-color-scheme`).
- **Code splitting:** el dashboard (y la librería de gráficas) se carga bajo demanda.

### Git

Se sugiere usar [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`) con commits pequeños por funcionalidad.

## Seguridad: decisiones y limitaciones

- **Contraseñas:** PBKDF2-SHA256 con 600k iteraciones y sal aleatoria; comparación en tiempo
  constante; mensaje de login genérico.
- **API:** `helmet` (headers de seguridad), `x-powered-by` deshabilitado, CORS limitado al origen
  del frontend, cuerpo JSON máximo de 10 KB, _rate limit_ de 30 pagos por minuto por IP, y los
  logs **no** registran cuerpos de peticiones (podrían contener datos de tarjeta).
- **Ningún error de SnailPay aplica saldo**, y el frontend no confía ciegamente en la respuesta.

Limitaciones conocidas (aceptadas por el alcance de la prueba):

- La autenticación es una **simulación local**: cualquiera con acceso al navegador puede leer o
  modificar `localStorage`. En un sistema real el registro/login y el hash de contraseñas vivirían
  en el servidor (p. ej. Argon2id/bcrypt) con sesión en cookie `HttpOnly`.
- El **saldo vive en el cliente**, así que podría alterarse manualmente. En producción el backend
  sería la única fuente de verdad del saldo y SnailPay notificaría vía webhook.
- **Guardar número de tarjeta y CVV** (en respuestas y en `localStorage`) es un requerimiento
  explícito de la prueba con datos ficticios; en un sistema real está prohibido por PCI DSS
  (el CVV nunca se almacena y la tarjeta se tokeniza).
- `payer_id`/`payer_email` los envía el cliente; sin un backend de usuarios no se pueden verificar.

## Estado del proyecto

### Funcionalidades terminadas

- [x] Registro con nombre, correo, contraseña y confirmación, con validaciones.
- [x] Inicio de sesión, cierre de sesión y persistencia tras recargar la página.
- [x] Acceso al dashboard solo con sesión activa.
- [x] Saldo inicial de $0.
- [x] Dashboard con nombre, saldo, donut de apuestas, barras de victorias (6 caracoles, 6 carreras),
      resultados del día e historial de recargas.
- [x] SnailPay en Express con cobro exitoso, 7 rechazos de transacción, validaciones, error del
      sistema (tarjeta y variable de entorno) y timeout.
- [x] Respuestas con todos los campos requeridos, incluyendo tarjeta y CVV.
- [x] Actualización inmediata del saldo y persistencia en `localStorage`.
- [x] Manejo en el frontend de rechazo, error del sistema, timeout, error de red y respuestas
      inconsistentes, sin modificar el saldo.
- [x] Pruebas automatizadas en backend y frontend.
- [x] Propuesta de base de datos (tarea adicional 2, solo diseño).

### Pendientes / posibles mejoras

- Despliegue público (tarea adicional 1).
- Pruebas end-to-end en navegador real (p. ej. Playwright) sobre el flujo completo con la API.
- Implementar la propuesta de base de datos: mover autenticación y saldo al backend.
- Idempotency key en la petición a SnailPay para reintentos seguros tras un timeout.
- Internacionalización de mensajes (actualmente solo español).

## Propuesta de base de datos

Diseño (no implementado) para reemplazar `localStorage` por **PostgreSQL**:

- [`docs/database/propuesta-base-de-datos.md`](docs/database/propuesta-base-de-datos.md): tecnología,
  estándar de nomenclatura, diagrama entidad-relación, diccionario de datos con tipos, llaves
  primarias y foráneas, relaciones y los cambios necesarios en frontend y backend.
- [`docs/database/schema.sql`](docs/database/schema.sql): DDL completo. Tiene 9 tablas: `users`,
  `sessions`, `wallets`, `payments`, `wallet_movements`, `snails`, `races`, `race_entries` y `bets`.

## Herramientas, librerías y uso de IA

- **Plantillas:** no se usó plantilla ni librería de componentes; la interfaz (componentes y CSS
  con tokens de diseño) se construyó desde cero. El proyecto de Vite se configuró manualmente.
- **Librerías de terceros:** React, React Router, React Hook Form, Zod, Recharts, Express, Helmet,
  CORS, express-rate-limit; y para desarrollo Vite, Vitest, Testing Library, Supertest, ESLint,
  Prettier, tsx y concurrently.
- **Inteligencia artificial:** se utilizó un asistente de IA (Claude Code) como apoyo para el
  análisis del requerimiento, la generación inicial de código, pruebas y documentación. Todo el
  código fue revisado, ejecutado y validado con las pruebas automatizadas, lint, verificación de
  tipos y pruebas manuales en el navegador de cada escenario de SnailPay.
