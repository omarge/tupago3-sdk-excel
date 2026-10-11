# TuPago3 Excel Add-in — Guía de Sideload y Pruebas Manuales

> Complemento de Excel de SOLO LECTURA (GetCliente, GetCatalogo, GetQrStatus, GetTelefonicoStatus)
> respaldado por un BFF gateway HTTPS. Este documento es la lista reproducible de
> validación manual en Microsoft Excel (Web, Windows y Mac).

> ⚠️ GATE HOST = **NOT EXECUTED** en el entorno de build (no hay Microsoft Excel en
> Linux/CI). Las pruebas automatizadas cubren la lógica con un mock de Excel; la
> ejecución real en Excel debe realizarse siguiendo esta guía y registrarse aparte.

---

## 1. Prerrequisitos

- Microsoft Excel: Microsoft 365 (Windows, Mac) o Excel en la Web. Se requiere el
  conjunto de requisitos **ExcelApi 1.1+** (declarado en `manifest.xml`).
- El **gateway BFF** debe estar corriendo y servible por HTTPS desde la máquina donde
  se sideloada el add-in (para desarrollo: `https://localhost:8443` con el certificado
  autofirmado generado por el gateway; el navegador/Excel deben confiar en él, o usarlo
  solo en entornos controlados).
- El paquete de distribución interna: `dist-package/` (generado por `npm run pack`), que
  contiene `manifest.xml` y `wwwroot/` (Task Pane + assets).

## 2. Arrancar el gateway (desarrollo / validación)

```bash
cd gateway
BACKEND3_GRPC_TARGET=127.0.0.1:9090 \
BACKEND3_AUTH_URL=http://localhost:8091/api/authenticate \
GATEWAY_TLS=1 GATEWAY_PORT=8443 \
node server.js
# El gateway genera un certificado TLS autofirmado (CN=localhost) al iniciar.
```

- Para producción distribuida: `NODE_ENV=production GATEWAY_TLS=1` y un certificado de
  CA de confianza (no el autofirmado). El gateway **se niega a arrancar** en
  `NODE_ENV=production` sin TLS o con el flag de inseguridad.

## 3. Sideload del manifest

### Excel en la Web
1. Abrir Excel en la Web y un libro en blanco.
2. Insertar → Complementos → Mis complementos → Cargar mi complemento.
3. Seleccionar `dist-package/manifest.xml`.
4. Confirmar que el panel "TuPago3 · Excel" aparece a la derecha.

### Excel para Windows / Mac
1. Archivo → Opciones → Centro de confianza → Configuración del centro de confianza →
   Catálogos de complementos de confianza.
2. Agregar la URL del `manifest.xml` (o copiar el manifest a una carpeta de catálogo de
   confianza) y marcar "Mostrar en el menú".
3. Insertar → Mis complementos → TuPago3 Excel.
   (Alternativa: arrastrar el `manifest.xml` a un libro abierto en Excel para Windows/Mac
   compatibles con sideload por archivo.)

## 4. Lista reproducible de pruebas manuales

| # | Prueba | Pasos | Resultado esperado |
|---|--------|-------|--------------------|
| M1 | Detección de ExcelApi | Abrir el panel → pestaña **Excel** | "ExcelApi 1.1+ detectado: Sí" |
| M2 | Inicio de sesión | Pestaña **Sesión** → usuario/contraseña de TuPago3 → Conectar | "Sesión activa" con login, roles y expiración |
| M3 | Catálogo (positivo) | Pestaña **Clientes** → ID cliente → Consultar | Se muestra el perfil y el catálogo; estado 200 real vía gateway |
| M4 | Cliente sin datos | ID inexistente/ajeno → Consultar | Error controlado (404/403 del backend3), sin cerrar el panel |
| M5 | Estados QR | Pestaña **Estados** → QR → IDC + ID cuenta → Consultar | Detalle de estado; insertar en Excel |
| M6 | Estados Telefónico | Igual con tipo Telefónico | Detalle de estado; insertar en Excel |
| M7 | Inserción en Excel | Cualquier resultado → "Insertar en Excel" | Se crea hoja `TuPago3_*` con tabla estructurada |
| M8 | No sobrescritura | Re-insertar sin confirmar en hoja ocupada | `RangeOccupiedError` amigable, sin pisar datos del usuario |
| M9 | Int64 / ceros iniciales | Revisar columnas `id`, `claveInstitucion` | Valores como **texto**, sin recorte de ceros ni notación científica |
| M10 | Inyección de fórmula | Un valor remoto que empiece con `=`/`+`/`-`/`@` | Se muestra como texto (prefijo `'`), no se ejecuta como fórmula |
| M11 | Importe monetario | Columnas de monto | Número con formato de moneda, computable |
| M12 | Sin endpoints Create | Inspeccionar red (DevTools/Fiddler) | Solo GET `/v1/cliente`, `/v1/catalogo`, `/v1/qr-status`, `/v1/telefonico-status`, POST `/v1/login`, `/healthz`; ningún Create |
| M13 | Cierre de sesión | Pestaña **Sesión** → Cerrar sesión | Token eliminado de memoria; siguiente llamada → 401 |

## 5. Verificación de seguridad (manual)

- El token JWT vive solo en memoria (ver `src/auth/session.ts`); no en `localStorage`
  persistente del libro ni en registros.
- El gateway exige Bearer JWT en cada lectura; CORS allow-list no sustituye autenticación.
- Límite de tasa dedicado en `/v1/login` (anti fuerza bruta).
- Validación estricta de entradas (`claveInstitucion`, `idc` solo `[A-Za-z0-9_-]`; `id`/
  `idCuenta` numéricos).
- El paquete `dist-package/` no contiene certificados privados ni secretos HS512.

## 6. Criterio de aceptación

El add-in queda **HOST CERTIFIED** solo cuando M1–M13 se ejecutan con éxito en una
instancia real de Microsoft Excel (Web/Windows/Mac) contra el gateway y backend3. Hasta
entonces se considera **READY FOR CONTROLLED INTERNAL HOST VALIDATION**.
