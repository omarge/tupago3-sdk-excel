# TUPAGO3 SDK EXCEL — Microsoft Office Add-in

Complemento de Excel (Task Pane) que consume de forma segura las operaciones de
**solo lectura** de TuPago3 desde una interfaz Office.js, a través de un BFF
gateway (puerta de enlace) que traduce las operaciones autorizadas y nunca expone
el transporte gRPC al navegador de Excel.

## Arquitectura

```
Excel (Office host)
   │  Office.js (task pane, React)
   ▼
TUPAGO3 Excel Add-in  ──HTTPS (Bearer JWT)──►  BFF Gateway (Node/TS)
                                                    │  oficial @tupago/tupago3-sdk-typescript (gRPC)
                                                    ▼
                                              backend3 (PaymentService, read-only)
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
