import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TupagoApiClient } from "./api/client.js";
import { TupagoApiError } from "./models/types.js";
import { sessionStore } from "./auth/session.js";
import { buildCatalogoModel, buildClienteModel, buildStatusModel } from "./excel/worksheetBuilder.js";
import { importModel } from "./excel/officeBridge.js";
import { RangeOccupiedError } from "./excel/excelOps.js";
import { isExcelApiSupported, officeReady, getOfficeHost } from "./office/requirements.js";
import type { CatalogoInstitucion, ClientePerfil, StatusResult, WorksheetModel } from "./models/types.js";

type Tab = "sesion" | "clientes" | "estados" | "excel" | "config";

const ADDIN_VERSION = "0.1.0";

function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return <div className={`alert ${kind}`}>{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("sesion");
  const [gatewayUrl, setGatewayUrl] = useState<string>(
    (typeof localStorage !== "undefined" && localStorage.getItem("tupago.gatewayUrl")) || "https://localhost:8443",
  );
  const [identity, setIdentity] = useState(sessionStore.getIdentity());
  const [excelOk, setExcelOk] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ kind: "error" | "success" | "info"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const client = useMemo(
    () => new TupagoApiClient(gatewayUrl.replace(/\/$/, ""), () => sessionStore.getToken()),
    [gatewayUrl],
  );

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem("tupago.gatewayUrl", gatewayUrl);
  }, [gatewayUrl]);

  useEffect(() => {
    setExcelOk(isExcelApiSupported());
    officeReady().then(() => setExcelOk(isExcelApiSupported()));
  }, []);

  const refreshIdentity = useCallback(() => setIdentity(sessionStore.getIdentity()), []);

  const handleError = useCallback((e: unknown) => {
    if (e instanceof TupagoApiError) {
      setStatus({ kind: "error", msg: `[${e.kind}] ${e.message}` });
    } else if (e instanceof RangeOccupiedError) {
      setStatus({ kind: "error", msg: e.message });
    } else {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const doImport = useCallback(
    async (model: WorksheetModel, opts: { preferNewSheet: boolean; confirmOverwrite: boolean }) => {
      try {
        await officeReady();
        const r = await importModel(model, { preferNewSheet: opts.preferNewSheet, confirmOverwrite: opts.confirmOverwrite });
        setStatus({ kind: "success", msg: `Importado en hoja "${r.sheetName}" (${r.plan.action}).` });
        setTab("excel");
      } catch (e) {
        handleError(e);
      }
    },
    [handleError],
  );

  return (
    <div>
      <div className="app-header">
        <span>TuPago3 · Excel</span>
        <span className="badge">v{ADDIN_VERSION}</span>
      </div>
      <div className="app-tabs">
        {(["sesion", "clientes", "estados", "excel", "config"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {LABELS[t]}
          </button>
        ))}
      </div>
      <div className="app-body">
        {status && (
          <div style={{ marginBottom: 12 }}>
            <Alert kind={status.kind}>{status.msg}</Alert>
          </div>
        )}
        {tab === "sesion" && (
          <SesionPanel client={client} identity={identity} onAuth={refreshIdentity} onError={handleError} />
        )}
        {tab === "clientes" && (
          <ClienteTab client={client} busy={busy} setBusy={setBusy} onError={handleError} onImport={doImport} />
        )}
        {tab === "estados" && (
          <EstadosTab client={client} busy={busy} setBusy={setBusy} onError={handleError} onImport={doImport} />
        )}
        {tab === "excel" && <ExcelTab excelOk={excelOk} />}
        {tab === "config" && (
          <ConfigTab gatewayUrl={gatewayUrl} setGatewayUrl={setGatewayUrl} excelOk={excelOk} host={getOfficeHost()} />
        )}
      </div>
    </div>
  );
}

const LABELS: Record<Tab, string> = {
  sesion: "Sesión",
  clientes: "Clientes",
  estados: "Estados",
  excel: "Excel",
  config: "Config",
};

// ---------------- Sesión ----------------
function SesionPanel({
  client,
  identity,
  onAuth,
  onError,
}: {
  client: TupagoApiClient;
  identity: ReturnType<typeof sessionStore.getIdentity>;
  onAuth: () => void;
  onError: (e: unknown) => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    try {
      const r = await client.login(user, pass);
      sessionStore.set(r.token, { login: r.login, roles: r.roles, expiresAt: r.expiresAt });
      onAuth();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
      setPass("");
    }
  };

  const logout = () => {
    sessionStore.clear();
    onAuth();
  };

  if (identity) {
    return (
      <div className="panel">
        <p className="section-title">Sesión activa</p>
        <table className="mini">
          <tbody>
            <tr>
              <th>Usuario</th>
              <td>{identity.login}</td>
            </tr>
            <tr>
              <th>Roles</th>
              <td>{identity.roles.join(", ") || "—"}</td>
            </tr>
            <tr>
              <th>Expira</th>
              <td>{new Date(identity.expiresAt).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div>
          <button className="btn secondary" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
        <p className="hint">El token se mantiene solo en memoria y nunca se escribe en el libro ni en registros.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <p className="section-title">Conectar a TuPago3</p>
      <Field label="Usuario">
        <input type="text" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Contraseña">
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" />
      </Field>
      <div>
        <button className="btn" onClick={login} disabled={busy || !user || !pass}>
          {busy ? "Conectando…" : "Conectar"}
        </button>
      </div>
    </div>
  );
}

// ---------------- Clientes ----------------
function ClienteTab({
  client,
  busy,
  setBusy,
  onError,
  onImport,
}: {
  client: TupagoApiClient;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onError: (e: unknown) => void;
  onImport: (m: WorksheetModel, o: { preferNewSheet: boolean; confirmOverwrite: boolean }) => void;
}) {
  const [id, setId] = useState("");
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoInstitucion | null>(null);

  const consultar = async () => {
    if (!id.trim()) return;
    setBusy(true);
    try {
      const p = await client.getCliente(id.trim());
      setPerfil(p);
      try {
        setCatalogo(await client.getCatalogo(p.cliente?.claveInstitucion || p.catalogoInstitucion?.claveInstitucion || ""));
      } catch {
        setCatalogo(null);
      }
    } catch (e) {
      onError(e);
      setPerfil(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <p className="section-title">Consultar cliente (GetCliente)</p>
      <div className="row">
        <Field label="ID de cliente (int64)">
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} />
        </Field>
        <button className="btn" onClick={consultar} disabled={busy || !id.trim()}>
          {busy ? "…" : "Consultar"}
        </button>
      </div>
      {perfil && (
        <>
          <PreJson data={perfil} />
          <button
            className="btn secondary"
            onClick={() => onImport(buildClienteModel(perfil), { preferNewSheet: true, confirmOverwrite: false })}
          >
            Insertar en Excel
          </button>
        </>
      )}
      {catalogo && (
        <>
          <p className="section-title">Catálogo institucional (GetCatalogo)</p>
          <PreJson data={catalogo} />
          <button
            className="btn secondary"
            onClick={() => onImport(buildCatalogoModel(catalogo), { preferNewSheet: true, confirmOverwrite: false })}
          >
            Insertar catálogo en Excel
          </button>
        </>
      )}
    </div>
  );
}

// ---------------- Estados ----------------
function EstadosTab({
  client,
  busy,
  setBusy,
  onError,
  onImport,
}: {
  client: TupagoApiClient;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onError: (e: unknown) => void;
  onImport: (m: WorksheetModel, o: { preferNewSheet: boolean; confirmOverwrite: boolean }) => void;
}) {
  const [tipo, setTipo] = useState<"qr" | "telefonico">("qr");
  const [idc, setIdc] = useState("");
  const [idCuenta, setIdCuenta] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);

  const consultar = async () => {
    if (!idc.trim() || !idCuenta.trim()) return;
    setBusy(true);
    try {
      const r = tipo === "qr" ? await client.getQrStatus(idc.trim(), idCuenta.trim()) : await client.getTelefonicoStatus(idc.trim(), idCuenta.trim());
      setResult(r);
    } catch (e) {
      onError(e);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <p className="section-title">Estado de pago (GetQrStatus / GetTelefonicoStatus)</p>
      <Field label="Tipo">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "qr" | "telefonico")}>
          <option value="qr">QR</option>
          <option value="telefonico">Teléfonico</option>
        </select>
      </Field>
      <div className="row">
        <Field label="IDC">
          <input type="text" value={idc} onChange={(e) => setIdc(e.target.value)} />
        </Field>
        <Field label="ID de cuenta (int64)">
          <input type="text" value={idCuenta} onChange={(e) => setIdCuenta(e.target.value)} />
        </Field>
        <button className="btn" onClick={consultar} disabled={busy || !idc.trim() || !idCuenta.trim()}>
          {busy ? "…" : "Consultar"}
        </button>
      </div>
      {result && (
        <>
          <PreJson data={JSON.parse(result.json || "null")} />
          <button
            className="btn secondary"
            onClick={() =>
              onImport(buildStatusModel(tipo === "qr" ? "qrStatus" : "telefonicoStatus", result), {
                preferNewSheet: true,
                confirmOverwrite: false,
              })
            }
          >
            Insertar en Excel
          </button>
        </>
      )}
    </div>
  );
}

// ---------------- Excel ----------------
function ExcelTab({ excelOk }: { excelOk: boolean | null }) {
  return (
    <div className="panel">
      <p className="section-title">Operaciones en Excel</p>
      <Alert kind={excelOk === false ? "error" : "info"}>
        {excelOk === null
          ? "Detectando compatibilidad de ExcelApi…"
          : excelOk
            ? "ExcelApi 1.1+ detectado. La inserción crea una hoja/table dedicada y no sobrescribe datos existentes sin confirmación."
            : "No se detectó ExcelApi. El complemento requiere Excel Microsoft 365 (Windows / Web / Mac)."}
      </Alert>
      <p className="hint">
        • Cada inserción crea una hoja nueva con una tabla estructurada.<br />
        • Los valores int64 y referencias con ceros iniciales se conservan como texto.<br />
        • Los importes monetarios se formatean como número con formato de moneda.<br />
        • Todo texto remoto se trata como dato y se neutraliza contra inyección de fórmulas.
      </p>
    </div>
  );
}

// ---------------- Config ----------------
function ConfigTab({
  gatewayUrl,
  setGatewayUrl,
  excelOk,
  host,
}: {
  gatewayUrl: string;
  setGatewayUrl: (s: string) => void;
  excelOk: boolean | null;
  host: string | null;
}) {
  const [diag, setDiag] = useState<string>("—");
  const test = async () => {
    try {
      const res = await fetch(`${gatewayUrl.replace(/\/$/, "")}/healthz`);
      setDiag(res.ok ? `OK (${res.status}) — gateway accesible` : `HTTP ${res.status}`);
    } catch (e) {
      setDiag(`No accesible: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  return (
    <div className="panel">
      <p className="section-title">Configuración</p>
      <Field label="Endpoint HTTPS del gateway">
        <input type="text" value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} />
      </Field>
      <button className="btn secondary" onClick={test}>
        Diagnóstico de conectividad
      </button>
      <p className="hint">Diagnóstico: {diag}</p>
      <table className="mini">
        <tbody>
          <tr>
            <th>Versión del add-in</th>
            <td>{ADDIN_VERSION}</td>
          </tr>
          <tr>
            <th>Host de Office</th>
            <td>{host ?? "—"}</td>
          </tr>
          <tr>
            <th>ExcelApi 1.1+</th>
            <td>{excelOk ? "Sí" : "No"}</td>
          </tr>
          <tr>
            <th>Operaciones</th>
            <td>GetCliente · GetCatalogo · GetQrStatus · GetTelefonicoStatus (solo lectura)</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        El gateway expone SOLO operaciones de consulta. No existen endpoints Create en este add-in.
      </p>
    </div>
  );
}

function PreJson({ data }: { data: unknown }) {
  return <div className="result">{JSON.stringify(data, null, 2)}</div>;
}
