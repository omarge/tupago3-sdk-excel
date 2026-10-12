# TuPago3 Excel Add-in — Guía de Despliegue y Distribución Interna

> Complemento de Excel de SOLO LECTURA respaldado por un BFF gateway HTTPS.
> Este documento prepara la distribución controlada interna: dominio, certificado
> confiable, separación lab/producción y empaquetado. NO publica en Marketplace.

---

## 1. Arquitectura y límites

- El add-in (Task Pane React) y el BFF gateway se sirven desde el **mismo origen HTTPS**
  (el gateway sirve `dist/` estáticamente y expone `/v1/*`). Por eso el `SourceLocation`
  del manifest y la `VITE_GATEWAY_URL` del add-in deben coincidir con el dominio real.
- Operaciones habilitadas (solo lectura): `GET /v1/cliente/:id`, `GET /v1/catalogo/:clave`,
  `GET /v1/qr-status`, `GET /v1/telefonico-status`, `POST /v1/login`, `GET /healthz`.
  **No existen** `createQr` / `createTelefonico` (verificado: 404).
- El gateway NO verifica firmas JWT; reenvía el Bearer a backend3, que es la autoridad
  de firma y propiedad. backend3 impone aislamiento por propietario (otro propietario → 404).

## 2. Dominio y certificado confiable

1. Obtener un certificado TLS de una CA de confianza para el dominio de distribución
   (p.ej. `excel.tupago3.example`). **Las claves privadas NUNCA se commitean.**
2. Colocar los archivos en el host de ejecución (fuera del repo), p.ej.
   `/etc/tupago/gateway/fullchain.pem` y `/etc/tupago/gateway/privkey.pem`, con permisos
   de solo lectura para el usuario del servicio.
3. El gateway carga el certificado desde variables de entorno (rutas de archivo), no desde
   el repo. Si no se proveen, cae a un certificado autofirmado **solo para LAB** y
   `NODE_ENV=production` se niega a arrancar (ver sección 4).

## 3. Variables de entorno del gateway

| Variable | Lab (desarrollo) | Producción (distribución) |
|----------|------------------|---------------------------|
| `NODE_ENV` | (omitir / `development`) | `production` |
| `GATEWAY_TLS` | `1` | `1` |
| `GATEWAY_PORT` | `8443` | `8443` (o 443 con proxy) |
| `GATEWAY_TLS_CERT` | (omitir → autofirmado) | ruta al `fullchain.pem` |
| `GATEWAY_TLS_KEY` | (omitir → autofirmado) | ruta al `privkey.pem` |
| `GATEWAY_ALLOW_INSECURE` | `1` (permitido en dev) | **no definir** |
| `GATEWAY_CORS_ORIGINS` | `https://localhost:8443` | `https://excel.tupago3.example` |
| `BACKEND3_GRPC_TARGET` | `127.0.0.1:9090` | destino gRPC de producción |
| `BACKEND3_AUTH_URL` | `http://localhost:8091/api/authenticate` | URL auth de producción |

Plantilla (NO commitear con valores reales; `.env` y `.env.*` ya están en `.gitignore`):

```bash
# deploy/env.template  — copiar a .env del host, fuera del repo
NODE_ENV=production
GATEWAY_TLS=1
GATEWAY_PORT=8443
GATEWAY_TLS_CERT=/etc/tupago/gateway/fullchain.pem
GATEWAY_TLS_KEY=/etc/tupago/gateway/privkey.pem
# GATEWAY_ALLOW_INSECURE must stay UNSET in production
GATEWAY_CORS_ORIGINS=https://excel.tupago3.example
BACKEND3_GRPC_TARGET=10.0.0.10:9090
BACKEND3_AUTH_URL=https://backend3.tupago3.example/api/authenticate
```

## 4. Separación gateway de LAB vs DISTRIBUCIÓN

- **LAB**: `NODE_ENV` distinto de `production`, `GATEWAY_ALLOW_INSECURE=1`, certificado
  autofirmado CN=localhost. Sirve `https://localhost:8443`. El add-in usa el default
  `https://localhost:8443` (o override en `localStorage`).
- **DISTRIBUCIÓN**: `NODE_ENV=production`, TLS con certificado de CA, `GATEWAY_ALLOW_INSECURE`
  ausente. `validateProductionConfig` **rechaza el arranque** si falta TLS, hay
  `GATEWAY_ALLOW_INSECURE=1`, o no se proveen `GATEWAY_TLS_CERT`/`GATEWAY_TLS_KEY`.
  Esto impide que una configuración permisiva de laboratorio se envíe como producción.
- El mismo binario/server se usa en ambos; la diferencia es 100% configuración por entorno.

## 5. Construcción del add-in apuntando al dominio real

```bash
# Build del add-in con la URL del gateway de producción inyectada en build-time.
VITE_GATEWAY_URL=https://excel.tupago3.example npm run build
```

La precedencia de la URL del gateway en el add-in es:
1. override en `localStorage` `tupago.gatewayUrl` (dev/operador),
2. `VITE_GATEWAY_URL` (build de distribución),
3. default `https://localhost:8443` (lab).

Luego genera el paquete de distribución interna:

```bash
npm run pack          # -> dist-package/ con manifest.xml + wwwroot/ + PACKAGE-MANIFEST.txt
```

Para distribución, reemplaza `dist-package/manifest.xml` por la versión del dominio real
(ver `deploy/manifest.dist.xml`, sustituyendo `excel.tupago3.example`).

## 6. Verificación del paquete

- `dist-package/PACKAGE-MANIFEST.txt` lista SHA256 de cada archivo y debe indicar
  `secret-scan: PASS (no secrets detected)`.
- Confirmar que `wwwroot/taskpane.html`, `wwwroot/assets/*` e `icon-*.png` están presentes.
- No debe contener certificados privados ni secretos HS512 (el script de empaquetado
  escanea y elimina `gateway/certs` si existiera).

## 7. Validación en host Excel real

- Sigue `docs/SIDELOAD.md` (pasos M1–M13) en Microsoft Excel real (Web/Windows/Mac) contra
  el gateway de distribución y backend3.
- El add-in queda **HOST CERTIFIED** solo tras ejecutar M1–M13 con éxito en Excel real.
- Estado actual de este repositorio: **HOST NOT EXECUTED** (no hay Microsoft Excel en el
  entorno de build Linux/CI; no se sustituye por mocks).

## 8. Seguridad

- Claves privadas TLS: fuera del repo, solo rutas en env. `.env`/`.env.*` en `.gitignore`.
- JWT en memoria (`src/auth/session.ts`); no `localStorage` persistente ni logs.
- CORS allow-list no sustituye autenticación Bearer; rate-limit dedicado en `/v1/login`.
- Validación estricta de entradas (`assertSafeIdentifier`); int64 como texto; sin inyección
  de fórmulas (prefijo `'`).

## 9. Despliegue y rollback

- Despliegue: instalar dependencias (`npm ci`), construir (`npm run build`), empaquetar
  (`npm run pack`), arrancar el gateway con el env de producción (sección 3).
- Rollback: este repo usa solo fast-forward; revierte al commit anterior y reconstruye.
- CI (GitHub Actions) debe estar GREEN antes de cada despliegue.
