# TUPAGO3 SDK EXCEL — Complemento de Microsoft Office

Complemento de Excel (Task Pane) que consume de forma segura las operaciones de
**solo lectura** de TuPago3 desde una interfaz Office.js, a través de un BFF
gateway que traduce las operaciones autorizadas y nunca expone el transporte gRPC
al navegador de Excel.

## Arquitectura

```
Excel (Office host)
   │  Office.js (task pane, React)
   ▼
TUPAGO3 Excel Add-in  ──HTTPS (Bearer JWT)──►  BFF Gateway (Node/TS)
                                                    │  oficial @tupago/tupago3-sdk-typescript (gRPC)
                                                    ▼
                                              backend3 (PaymentService, solo lectura)
```

- **Add-in (frontend):** TypeScript strict + React + Office.js. No conoce gRPC ni secretos.
- **Gateway (BFF):** Node/TS. Expone solo 4 endpoints de lectura + login. Usa el SDK
  oficial de TuPago3 (gRPC). Valida JWT, CORS estricto, rate limiting, timeouts,
  redacción de logs. **No hay endpoints Create.**
- **backend3:** Instancia autorizada (PaymentService). El gateway revalida identidad y
  ownership en backend3 (defensa en profundidad).

## Operaciones (solo lectura)

| Operación      | Endpoint gateway                         |
| -------------- | ---------------------------------------- |
| GetCliente     | `GET /v1/cliente/:id`                    |
| GetCatalogo    | `GET /v1/catalogo/:clave`               |
| GetQrStatus    | `GET /v1/qr-status?idc=&idCuenta=`       |
| GetTelefonico  | `GET /v1/telefonico-status?idc=&idCuenta=`|

Login: `POST /v1/login` (delegado a backend3 `/api/authenticate`). El token JWT se
mantiene **solo en memoria**; nunca se escribe en el libro ni en `localStorage`.

## Seguridad

- HTTPS obligatorio fuera del laboratorio (el add-in rechaza endpoints `http` no locales).
- CORS restringido por allow-list.
- Prevención de inyección de fórmulas: cualquier valor remoto que empiece con
  `= + - @ tab cr` se neutraliza (se prefija con `'`).
- int64 se preserva como texto (sin pérdida de precisión); referencias con ceros
  iniciales se conservan como texto.
- Sin secretos en el paquete ni en registros (redacción automática).

## Desarrollo

```bash
npm ci
npm run build        # tsc --noEmit + vite build -> dist/
npm test             # Vitest: T01..T30
npm run lint
npm run typecheck
```

## Ejecutar el gateway (laboratorio)

```bash
# El gateway usa el SDK oficial hacia backend3 gRPC (p.ej. 127.0.0.1:9090)
GATEWAY_TLS=1 BACKEND3_GRPC_TARGET=127.0.0.1:9090 \
GATEWAY_CORS_ORIGINS=https://localhost:8443 \
npm run gateway
```

El gateway sirve el add-in (HTTPS en `:8443`) y la API `/v1/*`.

## Sideload en Excel

1. Generar el paquete: `npm run pack` (produce `dist-package/`).
2. **Excel para la Web:** Suba `manifest.xml` a un catálogo de complementos de
   confianza (SharePoint/Admin Center) o use "Cargar sin lado" (sideload) apuntando
   al `SourceLocation` HTTPS.
3. **Excel Windows / Mac:** Desarrollador ▸ Complementos ▸ Carga sin lado (sideload)
   seleccionando `manifest.xml`.
4. Abra el panel lateral TuPago3, inicie sesión, consulte e importe.

> En entornos sin Microsoft Excel (p.ej. Linux/CI) el host real NO se ejecuta; el
> gate G11 se reporta como `HOST-NOT-EXECUTED`.

## Pruebas

`npm test` ejecuta T01–T30. La integración real con backend3 (G7) requiere
`BACKEND3_LAB_JWT` y un target gRPC alcanzable; de lo contrario se marca
`NOT EXECUTED` (sin falso GREEN).

## Empaquetado

`dist-package/` contiene `manifest.xml`, `README.md`, `LICENSE`, `wwwroot/` (build
del add-in) y `PACKAGE-MANIFEST.txt` (hashes SHA-256, sin secretos).

## Limitaciones

- No ejecuta operaciones financieras Create.
- No publica en Microsoft Marketplace sin autorización.
- La certificación en host Excel real (Windows/Mac/Web) queda pendiente de ejecutar
  en un entorno con Microsoft Excel.


---

# Implementation manual / Manual de implementación

## Manual ES — Implementación paso a paso

**Índice:** [1. Requisitos](#manual-es--implementación-paso-a-paso) · [2. Instalación](#manual-es--implementación-paso-a-paso) · [3. Configuración](#manual-es--implementación-paso-a-paso) · [4. Ejemplo](#manual-es--implementación-paso-a-paso) · [5. Contrato C1–C6](#contrato-de-referencia--reference-contract) · [6. Seguridad y errores](#reglas-financieras--financial-safety-rules) · [7. Pruebas y distribución](#pruebas-y-aceptación--testing-and-acceptance)

1. **Requisitos:** Excel / Office Add-in + secure BFF. Disponer de acceso autorizado a backend3, credenciales JWT válidas y ambiente HTTPS, o laboratorio loopback explícitamente habilitado.
2. **Instalación:** `npm ci && npm run typecheck && npm run lint && npm test && npm run build && npm run pack`; verify `dist-package/PACKAGE-MANIFEST.txt` hashes. Deploy `dist-package/wwwroot` and `manifest.xml` to authorized HTTPS add-in infrastructure; enable Office sideload only in an approved tenant/host.
3. **Configuración:** seleccionar el transporte soportado; suministrar endpoint real y JWT mediante variable de entorno o proveedor de credenciales. No usar puertos de laboratorio como defaults productivos.
4. **Ejemplo de inicio:** ejecutar el ejemplo de abajo con los imports/exports públicos propios del SDK; sustituir los hostnames de ejemplo y consultar primero C5/C6.
5. **Contrato:** consultar tabla C1–C6; en C3 y C4 conservar `idc` e `idCuenta`, y en C5 exigir perfil compuesto.
6. **Errores y seguridad:** diferenciar `UnknownOutcome`, `PendingReconciliation`, `NOT_FOUND`, autenticación y permisos. Nunca reintentar creaciones automáticamente.
7. **Validación:** Run gateway tests plus `verify-no-create`; add-in is **READ ONLY C3–C6**, never C1/C2. Login uses gateway `/v1/login`; keep tokens in memory, sanitize Excel formula injection and preserve identifiers as text. Real Office host sideload is a separate gate.

### Ejemplo / Example (Excel / Office Add-in + secure BFF)

\`\`\`bash
# Lab example only: verify actual gateway environment variable names in gateway/config.ts
npm ci
npm run typecheck && npm run lint && npm test
npm run pack
npx tsx scripts/verify-no-create.mts
# Gateway's documented public reads:
# GET /v1/cliente/:id
# GET /v1/catalogo/:clave
# GET /v1/qr-status?idc=...&idCuenta=...
# GET /v1/telefonico-status?idc=...&idCuenta=...
\`\`\`

## Manual EN — Step-by-step implementation

**Contents:** [1. Prerequisites](#manual-en--step-by-step-implementation) · [2. Install](#manual-en--step-by-step-implementation) · [3. Configure](#manual-en--step-by-step-implementation) · [4. Example](#manual-en--step-by-step-implementation) · [5. C1–C6 wire contract](#contrato-de-referencia--reference-contract) · [6. Safety and errors](#reglas-financieras--financial-safety-rules) · [7. Verify and distribute](#pruebas-y-aceptación--testing-and-acceptance)

1. **Prerequisites:** Excel / Office Add-in + secure BFF; authorized backend3 credentials and a TLS-enabled endpoint (or explicitly authorized loopback lab).
2. **Install:** `npm ci && npm run typecheck && npm run lint && npm test && npm run build && npm run pack`; verify `dist-package/PACKAGE-MANIFEST.txt` hashes. Deploy `dist-package/wwwroot` and `manifest.xml` to authorized HTTPS add-in infrastructure; enable Office sideload only in an approved tenant/host.
3. **Configure:** choose a supported transport; supply the endpoint and JWT through environment-backed credential providers. Do not copy lab hosts or ports into production.
4. **Minimal example:** follow the SDK-specific example below. Replace placeholder endpoints and start with a C5/C6 read.
5. **Contract:** consult the exact C1–C6 wire table. Preserve `idc`/`idCuenta` and require the full composed C5 profile.
6. **Errors and security:** distinguish unknown financial outcomes, pending reconciliation, not-found and auth/ownership failures. Never automatically replay creates.
7. **Verification:** Run gateway tests plus `verify-no-create`; add-in is **READ ONLY C3–C6**, never C1/C2. Login uses gateway `/v1/login`; keep tokens in memory, sanitize Excel formula injection and preserve identifiers as text. Real Office host sideload is a separate gate.

## Contrato de referencia / Reference contract

**ES.** Autoridad: backend3 `omarge/tupagoback3` `bbf06c02bda06221b2f214075a4bf2bdf3345eb0`. El JWT determina identidad y alcance de propietario; jamás hardcodear secretos. `idc`, `idCuenta` y claves bancarias son identificadores: conservar su representación y ceros iniciales.

**EN.** Authority: backend3 at the pinned commit above. JWT determines caller identity/ownership. Never hardcode credentials. Preserve IDs and leading zeros; do not coerce long IDs through floating-point numbers.

| Operación / Operation | REST backend3 | GraphQL backend3 | gRPC |
|---|---|---|---|
| C1 CreateQr | `POST /api/payments/msjpagoqrusuario` | `createPagoQr` | `CreateQr` |
| C2 CreateTelefonico | `POST /api/payments/msjpagotelefonicousuario` | `createPagoTelefonico` | `CreateTelefonico` |
| C3 GetQrStatus | `POST /api/payments/estatusmsjqr` JSON `{"idc":"...","idCuenta":42}` | `pagoQrEstatusByCuenta(idc,idCuenta)` | `GetQrStatus` |
| C4 GetTelefonicoStatus | `POST /api/payments/estatusmsjcobrotelefonico` JSON `{"idCuenta":42,"idMsjdeCobro":"..."}` | `pagoTelefonicoEstatusByCuenta(idc,idCuenta)` | `GetTelefonicoStatus` |
| C5 GetCliente | `GET /api/clientes/{id}` **then** `GET /api/catalogo-institucions/clave/{claveInstitucion}` | `getCliente`/equivalent schema query | `GetCliente` |
| C6 GetCatalogo | `GET /api/catalogo-institucions/clave/{clave}` | `catalogoInstitucion` | `GetCatalogo` |

**ES.** En C4, `idMsjdeCobro` corresponde al `idc` público. C5 debe devolver `ClientePerfil` **compuesto**, no solamente el `ClienteDTO`. Los nombres de métodos del SDK pueden diferir de los nombres wire; usar las APIs públicas mostradas abajo.

**EN.** In C4, `idMsjdeCobro` is the public request's `idc`. C5 must return the **composed** `ClientePerfil`, not just `ClienteDTO`. SDK method names and wire operation names may differ.

### Reglas financieras / Financial safety rules

1. **ES:** C1/C2 tienen **un solo intento** por llamada; nunca activar reintentos automáticos de creación. **EN:** C1/C2 are single-attempt; never enable automatic creation retries.
2. **ES:** Guardar la clave de idempotencia original de cada pago. Un timeout, corte de conexión, 5xx, redirección o respuesta de éxito inválida después del posible envío es `UnknownOutcome`: **consultar estado/reconciliar**, no reenviar ciegamente ni generar otra clave. **EN:** Persist the caller-owned idempotency key. Post-dispatch ambiguity is `UnknownOutcome`: reconcile with the original identity, never blindly resend or mint a different key.
3. **ES:** `PendingReconciliation` (REST 202 autorizado, GraphQL `PAYMENT_PENDING_RECONCILIATION`, gRPC `ABORTED` + `TUPAGO_PENDING_RECONCILIATION`) no significa éxito ni autoriza reintento. **EN:** Pending is neither success nor permission to retry.
4. **ES:** C3–C6 son lecturas; sólo los errores transitorios elegibles pueden reintentarse dentro del límite de política. Errores de JWT, permisos, validación, conflicto o inexistencia no. **EN:** Only eligible transient read errors may be retried within a bounded policy; deterministic failures must not.
5. **ES:** TLS con verificación de identidad fuera de loopback; plaintext únicamente en laboratorio local explícito cuando el adaptador lo permita. Tokens sólo por proveedor seguro/entorno. **EN:** Verify TLS identity for remote targets; explicit local loopback lab exceptions only. Never ship lab keys or tokens.
6. **ES:** Backend3/PostgreSQL sigue siendo la autoridad financiera; el SDK no confirma liquidaciones. **EN:** Backend3/PostgreSQL remains the financial authority; an SDK response is not settlement proof.

### Pruebas y aceptación / Testing and acceptance

**ES — Secuencia:** (1) compilar y ejecutar tests, (2) construir paquete exacto, (3) instalarlo en consumidor **fuera del árbol fuente**, (4) probar JWT válido/ausente/inválido y C3–C6 contra backend3 aislado, (5) verificar ownership y `NOT_FOUND`, (6) C1/C2 solamente en sandbox aprobado sin pagos reales, (7) registrar HEAD, CI y SHA256. No afirmar E2E de transportes no probados.

**EN — Sequence:** (1) build and test, (2) produce the exact artifact, (3) install into a separate **out-of-tree** consumer, (4) verify valid/missing/invalid JWT and C3–C6 against an isolated real backend3, (5) verify ownership and typed `NOT_FOUND`, (6) test C1/C2 only in an explicitly approved non-production financial sandbox, (7) record HEAD, CI and SHA256. Do not claim untested transports as E2E-certified.

**Estado / Status:** local and read-only E2E certificates cover their **documented transports**, not production financial writes, Banxico/STP external calls, or real Microsoft Office host validation.

