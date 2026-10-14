import * as grpc from '@grpc/grpc-js';
import { BinaryWriter, BinaryReader } from '@bufbuild/protobuf/wire';

/**
 * Supplies the current Bearer JWT for every RPC. Implementations obtain the token from an
 * external source (OAuth2 client-credentials flow, secret manager, etc.). The SDK NEVER
 * embeds credentials (gate G3); implementations must likewise avoid hard-coded secrets.
 */
interface CredentialProvider {
    /**
     * @return a valid Bearer JWT (without the "Bearer " prefix), or null/undefined if
     *         unavailable (the client will then fail with UNAUTHENTICATED).
     */
    token(): string | null | undefined;
}

/**
 * Attaches the `authorization: Bearer <jwt>` metadata on every RPC, mirroring the backend's
 * `JwtServerInterceptor` expectation (ASCII lowercase key). The token is read at call time so
 * rotation/refresh is transparent and the token is never cached on the channel.
 *
 * Returning a blank token fails the call fast locally with UNAUTHENTICATED (the backend would
 * also reject), so no unauthenticated request ever reaches a financial endpoint.
 */
declare class BearerCallCredentials {
    /** Metadata key expected by the backend (ASCII, lowercase). */
    static readonly AUTHORIZATION = "authorization";
    static create(provider: CredentialProvider): grpc.CallCredentials;
}

/**
 * Operator-supplied TLS material for a non-loopback gRPC target. No secret is ever embedded in
 * the SDK or repo (gate G3); paths/certificates are provided at runtime by the calling
 * application (file path or in-memory PEM).
 */
declare class TlsConfig {
    readonly trustCertChainPath?: string;
    readonly trustCertChainBytes?: Uint8Array;
    readonly useSystemTrust: boolean;
    private constructor();
    /** Use the runtime's default CA trust store (typical for public CAs). */
    static systemTrust(): TlsConfig;
    /** Trust an explicit PEM certificate chain file. */
    static trustCertChainFile(path: string): TlsConfig;
    /** Trust an explicit PEM certificate chain supplied in memory. */
    static trustCertChainBytes(bytes: Uint8Array): TlsConfig;
}

/**
 * Builds gRPC channels with the same FAIL-CLOSED posture as the backend's
 * GrpcTransportSecurity: plaintext is permitted ONLY to a loopback target; any non-loopback
 * target REQUIRES TLS (gate G3/G8). The SDK never opens an unencrypted, off-host financial
 * transport.
 */
declare class ChannelSecurity {
    private constructor();
    /** @return true if the host resolves to a loopback address (127.0.0.1 / ::1 / localhost). */
    static isLoopback(host: string): boolean;
    /** Plaintext channel for LOCAL development only (loopback target). Fails closed otherwise. */
    static plaintextLoopback(target: string): grpc.ChannelCredentials;
    /** TLS channel credentials for any target (required for non-loopback). */
    static tls(tls: TlsConfig): grpc.ChannelCredentials;
    /**
     * Convenience: choose transport by target. Loopback -> insecure (local dev); otherwise -> TLS.
     */
    static forTarget(target: string, tls?: TlsConfig): grpc.ChannelCredentials;
}

/**
 * Stable code embedded by the backend in the ABORTED status description (gate G6).
 * Must be preserved verbatim so the caller can machine-detect a pending-reconciliation state.
 */
declare const PENDING_RECONCILIATION_CODE = "TUPAGO_PENDING_RECONCILIATION";
/**
 * Base exception for all TUPAGO3 SDK failures. Wraps the originating gRPC status so the
 * backend's frozen error matrix is preserved verbatim (description + code carried through).
 */
declare class TupagoException extends Error {
    readonly code: grpc.status;
    readonly codeName: string;
    readonly description: string;
    readonly retryable: boolean;
    readonly pendingReconciliation: boolean;
    cause?: unknown;
    constructor(opts: {
        code: grpc.status;
        description: string;
        message: string;
        retryable: boolean;
        pendingReconciliation: boolean;
        cause?: unknown;
    });
    /** Whether the SDK is permitted to retry the operation that produced this error. */
    isRetryable(): boolean;
    /**
     * True only for the non-transient TUPAGO_PENDING_RECONCILIATION (ABORTED) condition.
     * When set, the caller MUST query status instead of resubmitting (gate G6).
     */
    isPendingReconciliation(): boolean;
}

/**
 * Decides whether (and how) an operation that failed with a {@link TupagoException} may be
 * retried. This is the single seam that enforces gate G4 (no automatic retry for CreateQr /
 * CreateTelefonico) and gate G6 (TUPAGO_PENDING_RECONCILIATION never retried).
 */
interface RetryPolicy {
    /**
     * @param attempt zero-based attempt index of the failure just observed
     * @param error   the error thrown by the failed attempt
     * @return true if another attempt should be made
     */
    shouldRetry(attempt: number, error: TupagoException): boolean;
    /** Computes the backoff delay (ms) to wait before the given (zero-based) attempt. */
    delayMillis(attempt: number): number;
}

/**
 * Never retries. Used for the financial create operations (CreateQr / CreateTelefonico) so the
 * SDK can never resubmit a payment automatically (gate G4). The caller is responsible for
 * deciding what to do next (e.g. query status with the same idempotency key).
 */
declare class NoRetryPolicy implements RetryPolicy {
    static readonly INSTANCE: NoRetryPolicy;
    shouldRetry(_attempt: number, _error: TupagoException): boolean;
    delayMillis(_attempt: number): number;
}

/**
 * Capped exponential backoff with jitter, retrying ONLY genuinely transient transport errors
 * (UNAVAILABLE / DEADLINE_EXCEEDED, i.e. TupagoException.isRetryable() === true).
 * Used for idempotent read operations. It never retries create operations (callers must pass
 * {@link NoRetryPolicy} there) and never retries TUPAGO_PENDING_RECONCILIATION.
 */
declare class BackoffRetryPolicy implements RetryPolicy {
    private readonly maxAttempts;
    private readonly baseDelayMillis;
    private readonly maxDelayMillis;
    constructor(maxAttempts: number, baseDelayMillis: number, maxDelayMillis: number);
    static of(maxAttempts: number): BackoffRetryPolicy;
    shouldRetry(attempt: number, error: TupagoException): boolean;
    delayMillis(attempt: number): number;
}

/**
 * Public, stable, typed request shapes for the financial create operations.
 *
 * int64 fields (idCuenta) are exposed as `bigint` to avoid unsafe JavaScript number coercion
 * (see SDK contract section 4). The wire protobuf encodes them as 64-bit integers; ts-proto
 * was generated with `forceLong=bigint` so decode/encode is lossless.
 *
 * `monto` is a `number` because the wire contract is `double` (payment.proto). Doubles cannot
 * represent all decimal fractions exactly. Callers MUST treat `monto` as a minor-unit-safe value
 * (e.g. integer centavos) or an already-rounded decimal, and validate it before sending. The SDK
 * validates finiteness and rejects `NaN`/`Infinity`; it does NOT silently round. See README
 * "Monetary precision" for the conversion matrix and limits.
 */
interface CreateQrParams {
    idCuenta: bigint;
    monto: number;
    concepto: string;
    referenciaNumerica: number;
    nombreCliente: string;
    email: string;
    tipoPago: number;
    vigencia: number;
    /** Stable idempotency key. Preserved verbatim on the wire and by the SDK (gate G9). */
    idempotencyKey: string;
}
interface CreateTelefonicoParams {
    key: string;
    monto: number;
    concepto: string;
    referenciaNumerica: number;
    numeroCelular: string;
    vigencia: number;
    /** Stable idempotency key. Preserved verbatim on the wire and by the SDK (gate G9). */
    idempotencyKey: string;
}
interface CallOptions {
    /** AbortSignal to cancel an in-flight RPC (gate G10). */
    signal?: AbortSignal;
    /** Per-call deadline override in milliseconds (defaults to client deadlineMillis). */
    deadlineMillis?: number;
}

interface GetClienteRequest {
    id: bigint;
}
declare const GetClienteRequest: MessageFns<GetClienteRequest>;
interface GetCatalogoRequest {
    claveInstitucion: string;
}
declare const GetCatalogoRequest: MessageFns<GetCatalogoRequest>;
interface GetStatusRequest {
    idc: string;
    idCuenta: bigint;
}
declare const GetStatusRequest: MessageFns<GetStatusRequest>;
interface CreateQrRequest {
    idCuenta: bigint;
    monto: number;
    concepto: string;
    referenciaNumerica: number;
    nombreCliente: string;
    email: string;
    tipoPago: number;
    vigencia: number;
    idempotencyKey: string;
}
declare const CreateQrRequest: MessageFns<CreateQrRequest>;
interface CreateTelefonicoRequest {
    key: string;
    monto: number;
    concepto: string;
    referenciaNumerica: number;
    numeroCelular: string;
    vigencia: number;
    idempotencyKey: string;
}
declare const CreateTelefonicoRequest: MessageFns<CreateTelefonicoRequest>;
interface ClientePerfil {
    cliente?: Cliente | undefined;
    catalogoInstitucion?: CatalogoInstitucion | undefined;
}
declare const ClientePerfil: MessageFns<ClientePerfil>;
interface Cliente {
    id: bigint;
    nombre: string;
    claveInstitucion: string;
    key: string;
}
declare const Cliente: MessageFns<Cliente>;
interface CatalogoInstitucion {
    id: bigint;
    claveInstitucion: string;
    nombreCorto: string;
}
declare const CatalogoInstitucion: MessageFns<CatalogoInstitucion>;
/**
 * Raw Banxico payloads (status + create responses) are returned as JSON strings so the
 * gRPC contract is a structural/transport peer of REST/GraphQL (same bytes).
 */
interface JsonResponse {
    json: string;
}
declare const JsonResponse: MessageFns<JsonResponse>;
type Builtin = Date | Function | Uint8Array | string | number | boolean | bigint | undefined;
type DeepPartial<T> = T extends bigint ? string | number | bigint : T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
interface MessageFns<T> {
    encode(message: T, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): T;
    fromJSON(object: any): T;
    toJSON(message: T): unknown;
    create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
    fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}

/**
 * Convenience view over the raw Banxico {@link JsonResponse} returned by status/create RPCs.
 * The SDK never assumes a fixed JSON shape (contract: lossless passthrough); callers may read
 * the raw string, parse to a tree, or bind to their own DTO.
 */
declare class JsonResponseView {
    private readonly response;
    constructor(response: JsonResponse);
    /** The raw JSON payload, exactly as returned by the backend. */
    json(): string;
    /** Parsed JSON value (throws if the payload is not valid JSON). */
    parsed(): unknown;
    /** Bind the raw JSON to a caller-supplied type via JSON.parse + cast. */
    as<T>(): T;
    /** The underlying generated protobuf message. */
    raw(): JsonResponse;
}

/**
 * Transport-neutral contract for the six TUPAGO3 payment operations.
 *
 * Every transport (gRPC / REST / GraphQL) implements this interface and returns the SAME
 * core domain types (ClientePerfil, CatalogoInstitucion, JsonResponseView). This is the
 * semantic authority: a transport only adapts the wire format to/from these types and must
 * enforce the financial-safety laws (bearer auth, caller-owned idempotency key, no blind
 * retry on creates, PendingReconciliation, fail-closed on malformed responses).
 */

interface TransportDeps {
    /** gRPC: host:port. REST: base URL e.g. http://127.0.0.1:8092. GraphQL: /graphql endpoint. */
    target: string;
    credentials: CredentialProvider;
    deadlineMillis?: number;
    readRetryPolicy?: RetryPolicy;
}
interface PaymentTransport {
    getCliente(id: bigint, opts?: CallOptions): Promise<ClientePerfil>;
    getCatalogo(claveInstitucion: string, opts?: CallOptions): Promise<CatalogoInstitucion>;
    getQrStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    getTelefonicoStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    createQr(req: CreateQrParams, opts?: CallOptions): Promise<JsonResponseView>;
    createTelefonico(req: CreateTelefonicoParams, opts?: CallOptions): Promise<JsonResponseView>;
    close(): void;
}

/**
 * Public, transport-neutral entry point for the six TUPAGO3 payment operations.
 *
 * By default it builds a gRPC transport (the original, GREEN behavior). It also accepts an
 * explicit {@link PaymentTransport} so the same six-method surface works over REST or GraphQL
 * without any change to calling code. All transports return the SAME core domain types
 * (ClientePerfil, CatalogoInstitucion, JsonResponseView) and enforce the same financial-safety
 * laws: bearer auth, caller-owned idempotency key, no blind retry on creates, PendingReconciliation,
 * and fail-closed validation.
 */
declare class TupagoPaymentClient {
    private readonly transport;
    constructor(opts: {
        target: string;
        credentials: CredentialProvider;
        tls?: TlsConfig;
        deadlineMillis?: number;
        readRetryPolicy?: RetryPolicy;
        /** Build on a specific transport (REST/GraphQL). Omit to use the default gRPC transport. */
        transport?: PaymentTransport;
    });
    /** Profile + institution catalog. */
    getCliente(id: bigint, opts?: CallOptions): Promise<ClientePerfil>;
    /** Institution catalog by clave_institucion. */
    getCatalogo(claveInstitucion: string, opts?: CallOptions): Promise<CatalogoInstitucion>;
    /** Banxico status (JSON) for a QR. */
    getQrStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    /** Banxico status (JSON) for a telefónico. */
    getTelefonicoStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    /**
     * Creates a QR payment. NEVER auto-retried (gate G4). Idempotency: pass a stable
     * idempotencyKey; the server dedupes identical keys. A transient transport error is
     * reclassified as TupagoUnknownOutcomeException (non-retryable) — do NOT blind-resubmit;
     * reuse the same key or call getQrStatus (correction #3).
     */
    createQr(req: CreateQrParams, opts?: CallOptions): Promise<JsonResponseView>;
    /**
     * Creates a telefonic payment. NEVER auto-retried (gate G4). Same idempotency/unknown-outcome
     * policy as createQr.
     */
    createTelefonico(req: CreateTelefonicoParams, opts?: CallOptions): Promise<JsonResponseView>;
    /** Shut down the underlying transport (gate G10). Idempotent. */
    close(): void;
}

declare function createRestTransport(deps: TransportDeps): RestPaymentTransport;
declare class RestPaymentTransport implements PaymentTransport {
    private readonly base;
    private readonly credentials;
    private readonly deadlineMillis;
    private readonly readRetryPolicy;
    constructor(deps: TransportDeps);
    getCliente(id: bigint, opts?: CallOptions): Promise<ClientePerfil>;
    getCatalogo(claveInstitucion: string, opts?: CallOptions): Promise<CatalogoInstitucion>;
    getQrStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    getTelefonicoStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    createQr(req: CreateQrParams, opts?: CallOptions): Promise<JsonResponseView>;
    createTelefonico(req: CreateTelefonicoParams, opts?: CallOptions): Promise<JsonResponseView>;
    close(): void;
    private getJson;
    private postJson;
    private headers;
    private dispatchRead;
    private dispatchCreate;
    private toReadError;
}

declare class GrpcPaymentTransport implements PaymentTransport {
    private readonly client;
    private readonly credentialProvider;
    private readonly deadlineMillis;
    private readonly readRetryPolicy;
    private closed;
    constructor(opts: {
        target: string;
        credentials: CredentialProvider;
        tls?: TlsConfig;
        deadlineMillis?: number;
        readRetryPolicy?: RetryPolicy;
    });
    getCliente(id: bigint, opts?: CallOptions): Promise<ClientePerfil>;
    getCatalogo(claveInstitucion: string, opts?: CallOptions): Promise<CatalogoInstitucion>;
    getQrStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    getTelefonicoStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    createQr(req: CreateQrParams, opts?: CallOptions): Promise<JsonResponseView>;
    createTelefonico(req: CreateTelefonicoParams, opts?: CallOptions): Promise<JsonResponseView>;
    close(): void;
    private executeRead;
    private executeReadView;
    private executeFinancial;
    private executeFinancialView;
    private unary;
}

/** Convenience factory mirroring the gRPC/REST construction. `target` is the base URL. */
declare function createGraphqlTransport(deps: TransportDeps): GraphqlPaymentTransport;
declare class GraphqlPaymentTransport implements PaymentTransport {
    private readonly base;
    private readonly credentials;
    private readonly deadlineMillis;
    private readonly readRetryPolicy;
    constructor(deps: TransportDeps);
    getCliente(id: bigint, opts?: CallOptions): Promise<ClientePerfil>;
    getCatalogo(claveInstitucion: string, opts?: CallOptions): Promise<CatalogoInstitucion>;
    getQrStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    getTelefonicoStatus(idc: string, idCuenta: bigint, opts?: CallOptions): Promise<JsonResponseView>;
    createQr(req: CreateQrParams, opts?: CallOptions): Promise<JsonResponseView>;
    createTelefonico(req: CreateTelefonicoParams, opts?: CallOptions): Promise<JsonResponseView>;
    close(): void;
    private post;
    private resultOrThrow;
    private dispatchRead;
    private dispatchCreate;
    /**
     * Normalize any read failure into a {@link TupagoException} so the configured readRetryPolicy can
     * make a single, uniform retry decision. A transport/network failure (NetworkError) becomes a
     * retryable TransientException; this is what makes GraphQL reads retry transient failures through
     * BackoffRetryPolicy (mirroring the REST transport's toReadError). Creates do NOT use this path.
     */
    private normalizeReadError;
}

/** Absent result (backend -> NOT_FOUND). Never auto-retried. */
declare class TupagoNotFoundException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}
/** Invalid argument (backend -> INVALID_ARGUMENT). Never auto-retried. */
declare class TupagoInvalidArgumentException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}
/** Permission denied (backend -> PERMISSION_DENIED). Never auto-retried. */
declare class TupagoPermissionDeniedException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}
/** Missing/invalid credentials (backend -> UNAUTHENTICATED). Never auto-retried. */
declare class TupagoUnauthenticatedException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}
/** Resource already exists (backend -> ALREADY_EXISTS). Never auto-retried. */
declare class TupagoAlreadyExistsException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}
/** Failed precondition (backend -> FAILED_PRECONDITION). Never auto-retried. */
declare class TupagoFailedPreconditionException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}
/** Server-side internal error (backend -> INTERNAL). Never auto-retried. */
declare class TupagoInternalException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}

/** Transient transport condition (UNAVAILABLE / DEADLINE_EXCEEDED). Retryable for reads only. */
declare class TupagoTransientException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}

/**
 * Non-transient unknown-remote-state (backend -> ABORTED, carries
 * TUPAGO_PENDING_RECONCILIATION). The caller MUST query status, never resubmit (gate G6).
 */
declare class TupagoAbortedException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}

/**
 * Unknown financial outcome for a CREATE operation. A transient transport error
 * (UNAVAILABLE / DEADLINE_EXCEEDED) observed on CreateQr / CreateTelefonico means the server
 * may or may not have persisted the payment — the result is UNKNOWN. Because blind resubmission
 * is financially dangerous, this is deliberately NON-retryable (gate G4) and signals the caller
 * to (a) re-invoke with the SAME idempotency_key so the server dedupes, or (b) call Get*Status.
 */
declare class TupagoUnknownOutcomeException extends TupagoException {
    constructor(code: grpc.status, description: string, cause?: unknown);
}

/**
 * Maps a gRPC error (ServiceError or generic Error) to the SDK exception hierarchy, preserving
 * the backend's frozen error matrix (section 2/8). The original status code and description are
 * carried verbatim so TUPAGO_PENDING_RECONCILIATION stays machine-detectable.
 *
 * The seven preserved gRPC states surfaced to callers:
 *   UNAUTHENTICATED, PERMISSION_DENIED, INVALID_ARGUMENT, ALREADY_EXISTS,
 *   FAILED_PRECONDITION, NOT_FOUND, ABORTED (pending reconciliation).
 * Plus transient UNAVAILABLE / DEADLINE_EXCEEDED (read-retryable) and INTERNAL.
 */
declare class StatusMapper {
    private constructor();
    static map(err: unknown): TupagoException;
}

export { BackoffRetryPolicy, BearerCallCredentials, type CallOptions, CatalogoInstitucion, ChannelSecurity, Cliente, ClientePerfil, type CreateQrParams, CreateQrRequest, type CreateTelefonicoParams, CreateTelefonicoRequest, type CredentialProvider, GetCatalogoRequest, GetClienteRequest, GetStatusRequest, GraphqlPaymentTransport, GrpcPaymentTransport, JsonResponse, JsonResponseView, NoRetryPolicy, PENDING_RECONCILIATION_CODE, type PaymentTransport, RestPaymentTransport, type RetryPolicy, StatusMapper, TlsConfig, type TransportDeps, TupagoAbortedException, TupagoAlreadyExistsException, TupagoException, TupagoFailedPreconditionException, TupagoInternalException, TupagoInvalidArgumentException, TupagoNotFoundException, TupagoPaymentClient, TupagoPermissionDeniedException, TupagoTransientException, TupagoUnauthenticatedException, TupagoUnknownOutcomeException, createGraphqlTransport, createRestTransport };
