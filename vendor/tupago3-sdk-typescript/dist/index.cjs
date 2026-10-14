"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BackoffRetryPolicy: () => BackoffRetryPolicy,
  BearerCallCredentials: () => BearerCallCredentials,
  CatalogoInstitucion: () => CatalogoInstitucion,
  ChannelSecurity: () => ChannelSecurity,
  Cliente: () => Cliente,
  ClientePerfil: () => ClientePerfil,
  CreateQrRequest: () => CreateQrRequest,
  CreateTelefonicoRequest: () => CreateTelefonicoRequest,
  GetCatalogoRequest: () => GetCatalogoRequest,
  GetClienteRequest: () => GetClienteRequest,
  GetStatusRequest: () => GetStatusRequest,
  GraphqlPaymentTransport: () => GraphqlPaymentTransport,
  GrpcPaymentTransport: () => GrpcPaymentTransport,
  JsonResponse: () => JsonResponse,
  JsonResponseView: () => JsonResponseView,
  NoRetryPolicy: () => NoRetryPolicy,
  PENDING_RECONCILIATION_CODE: () => PENDING_RECONCILIATION_CODE,
  RestPaymentTransport: () => RestPaymentTransport,
  StatusMapper: () => StatusMapper,
  TlsConfig: () => TlsConfig,
  TupagoAbortedException: () => TupagoAbortedException,
  TupagoAlreadyExistsException: () => TupagoAlreadyExistsException,
  TupagoException: () => TupagoException,
  TupagoFailedPreconditionException: () => TupagoFailedPreconditionException,
  TupagoInternalException: () => TupagoInternalException,
  TupagoInvalidArgumentException: () => TupagoInvalidArgumentException,
  TupagoNotFoundException: () => TupagoNotFoundException,
  TupagoPaymentClient: () => TupagoPaymentClient,
  TupagoPermissionDeniedException: () => TupagoPermissionDeniedException,
  TupagoTransientException: () => TupagoTransientException,
  TupagoUnauthenticatedException: () => TupagoUnauthenticatedException,
  TupagoUnknownOutcomeException: () => TupagoUnknownOutcomeException,
  createGraphqlTransport: () => createGraphqlTransport,
  createRestTransport: () => createRestTransport
});
module.exports = __toCommonJS(src_exports);

// src/transport/grpc.ts
var grpc6 = __toESM(require("@grpc/grpc-js"), 1);

// node_modules/@bufbuild/protobuf/dist/esm/wire/varint.js
function varint64read() {
  const buf = this.buf;
  let pos = this.pos;
  let lo = 0;
  let hi = 0;
  for (let shift = 0; shift < 28; shift += 7) {
    const b = buf[pos++];
    lo |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.pos = pos;
      this.assertBounds();
      this.varint64Lo = lo;
      this.varint64Hi = hi;
      return;
    }
  }
  const middleByte = buf[pos++];
  lo |= (middleByte & 15) << 28;
  hi = (middleByte & 112) >> 4;
  if ((middleByte & 128) == 0) {
    this.pos = pos;
    this.assertBounds();
    this.varint64Lo = lo;
    this.varint64Hi = hi;
    return;
  }
  for (let shift = 3; shift <= 31; shift += 7) {
    const b = buf[pos++];
    hi |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.pos = pos;
      this.assertBounds();
      this.varint64Lo = lo;
      this.varint64Hi = hi;
      return;
    }
  }
  throw new Error("invalid varint");
}
var TWO_PWR_32_DBL = 4294967296;
function int64FromString(dec) {
  const minus = dec[0] === "-";
  if (minus) {
    dec = dec.slice(1);
  }
  const base = 1e6;
  let lowBits = 0;
  let highBits = 0;
  function add1e6digit(begin, end) {
    const digit1e6 = Number(dec.slice(begin, end));
    highBits *= base;
    lowBits = lowBits * base + digit1e6;
    if (lowBits >= TWO_PWR_32_DBL) {
      highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
      lowBits = lowBits % TWO_PWR_32_DBL;
    }
  }
  add1e6digit(-24, -18);
  add1e6digit(-18, -12);
  add1e6digit(-12, -6);
  add1e6digit(-6);
  return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}
function int64ToString(lo, hi) {
  let bits = newBits(lo, hi);
  const negative = bits.hi & 2147483648;
  if (negative) {
    bits = negate(bits.lo, bits.hi);
  }
  const result = uInt64ToString(bits.lo, bits.hi);
  return negative ? "-" + result : result;
}
function uInt64ToString(lo, hi) {
  ({ lo, hi } = toUnsigned(lo, hi));
  if (hi <= 2097151) {
    return String(TWO_PWR_32_DBL * hi + lo);
  }
  const low = lo & 16777215;
  const mid = (lo >>> 24 | hi << 8) & 16777215;
  const high = hi >> 16 & 65535;
  let digitA = low + mid * 6777216 + high * 6710656;
  let digitB = mid + high * 8147497;
  let digitC = high * 2;
  const base = 1e7;
  if (digitA >= base) {
    digitB += Math.floor(digitA / base);
    digitA %= base;
  }
  if (digitB >= base) {
    digitC += Math.floor(digitB / base);
    digitB %= base;
  }
  return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA);
}
function toUnsigned(lo, hi) {
  return { lo: lo >>> 0, hi: hi >>> 0 };
}
function newBits(lo, hi) {
  return { lo: lo | 0, hi: hi | 0 };
}
function negate(lowBits, highBits) {
  highBits = ~highBits;
  if (lowBits) {
    lowBits = ~lowBits + 1;
  } else {
    highBits += 1;
  }
  return newBits(lowBits, highBits);
}
var decimalFrom1e7WithLeadingZeros = (digit1e7) => {
  const partial = String(digit1e7);
  return "0000000".slice(partial.length) + partial;
};
function varint32read() {
  let b = this.buf[this.pos++];
  if ((b & 128) === 0) {
    this.assertBounds();
    return b;
  }
  let result = b & 127;
  b = this.buf[this.pos++];
  result |= (b & 127) << 7;
  if ((b & 128) === 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 14;
  if ((b & 128) === 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 21;
  if ((b & 128) === 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 15) << 28;
  for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++)
    b = this.buf[this.pos++];
  if ((b & 128) !== 0)
    throw new Error("invalid varint");
  this.assertBounds();
  return result >>> 0;
}

// node_modules/@bufbuild/protobuf/dist/esm/proto-int64.js
var protoInt64 = /* @__PURE__ */ makeInt64Support();
function makeInt64Support() {
  const dv = new DataView(new ArrayBuffer(8));
  const ok = typeof BigInt === "function" && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function" && (!!globalThis.Deno || !!globalThis.Bun || typeof process != "object" || typeof process.env != "object" || process.env.BUF_BIGINT_DISABLE !== "1");
  if (ok) {
    const MIN = BigInt("-9223372036854775808");
    const MAX = BigInt("9223372036854775807");
    const UMIN = BigInt("0");
    const UMAX = BigInt("18446744073709551615");
    return {
      zero: BigInt(0),
      supported: true,
      parse(value) {
        const bi = typeof value == "bigint" ? value : BigInt(value);
        if (bi > MAX || bi < MIN) {
          throw new Error(`invalid int64: ${value}`);
        }
        return bi;
      },
      uParse(value) {
        const bi = typeof value == "bigint" ? value : BigInt(value);
        if (bi > UMAX || bi < UMIN) {
          throw new Error(`invalid uint64: ${value}`);
        }
        return bi;
      },
      enc(value) {
        dv.setBigInt64(0, this.parse(value), true);
        return {
          lo: dv.getInt32(0, true),
          hi: dv.getInt32(4, true)
        };
      },
      uEnc(value) {
        dv.setBigInt64(0, this.uParse(value), true);
        return {
          lo: dv.getInt32(0, true),
          hi: dv.getInt32(4, true)
        };
      },
      dec(lo, hi) {
        dv.setInt32(0, lo, true);
        dv.setInt32(4, hi, true);
        return dv.getBigInt64(0, true);
      },
      uDec(lo, hi) {
        dv.setInt32(0, lo, true);
        dv.setInt32(4, hi, true);
        return dv.getBigUint64(0, true);
      }
    };
  }
  return {
    zero: "0",
    supported: false,
    parse(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertInt64String(value);
      return value;
    },
    uParse(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertUInt64String(value);
      return value;
    },
    enc(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertInt64String(value);
      return int64FromString(value);
    },
    uEnc(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertUInt64String(value);
      return int64FromString(value);
    },
    dec(lo, hi) {
      return int64ToString(lo, hi);
    },
    uDec(lo, hi) {
      return uInt64ToString(lo, hi);
    }
  };
}
function assertInt64String(value) {
  if (!/^-?[0-9]+$/.test(value)) {
    throw new Error("invalid int64: " + value);
  }
}
function assertUInt64String(value) {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error("invalid uint64: " + value);
  }
}

// node_modules/@bufbuild/protobuf/dist/esm/wire/text-encoding.js
var te;
function configureTextEncoding(textEncoding) {
  var _a;
  te = Object.assign(Object.assign({}, textEncoding), { encodeUtf8Into: (_a = textEncoding.encodeUtf8Into) !== null && _a !== void 0 ? _a : emulateEncodeInto(textEncoding.encodeUtf8.bind(textEncoding)) });
}
function getTextEncoding() {
  if (!te) {
    const globals = globalThis;
    if (!globals.TextEncoder || !globals.TextDecoder) {
      throw new Error("encoding API missing: install TextEncoder and TextDecoder on globalThis");
    }
    const textEncoder = new globals.TextEncoder();
    const textDecoder = new globals.TextDecoder();
    let textDecoderStrict;
    const config = {
      encodeUtf8(text) {
        return textEncoder.encode(text);
      },
      decodeUtf8(bytes, strict) {
        if (strict) {
          if (!textDecoderStrict) {
            textDecoderStrict = new globals.TextDecoder("utf-8", {
              fatal: true
            });
          }
          return textDecoderStrict.decode(bytes);
        }
        return textDecoder.decode(bytes);
      },
      checkUtf8(text) {
        try {
          encodeURIComponent(text);
          return true;
        } catch (_) {
          return false;
        }
      }
    };
    if (textEncoder.encodeInto) {
      config.encodeUtf8Into = textEncoder.encodeInto.bind(textEncoder);
    }
    const nativeStringIsWellFormed = String.prototype.isWellFormed;
    if (nativeStringIsWellFormed) {
      config.checkUtf8 = (text) => {
        return nativeStringIsWellFormed.call(text);
      };
    }
    configureTextEncoding(config);
  }
  return te;
}
function emulateEncodeInto(encodeUtf8) {
  return (text, dest) => {
    const bytes = encodeUtf8(text);
    dest.set(bytes);
    return { written: bytes.byteLength };
  };
}

// node_modules/@bufbuild/protobuf/dist/esm/wire/binary-encoding.js
var WireType;
(function(WireType2) {
  WireType2[WireType2["Varint"] = 0] = "Varint";
  WireType2[WireType2["Bit64"] = 1] = "Bit64";
  WireType2[WireType2["LengthDelimited"] = 2] = "LengthDelimited";
  WireType2[WireType2["StartGroup"] = 3] = "StartGroup";
  WireType2[WireType2["EndGroup"] = 4] = "EndGroup";
  WireType2[WireType2["Bit32"] = 5] = "Bit32";
})(WireType || (WireType = {}));
var UINT32_MAX = 4294967295;
var INT32_MAX = 2147483647;
var INT32_MIN = -2147483648;
var BinaryWriter = class {
  constructor(encodeUtf8) {
    this.stackPos = [];
    this.encodeUtf8Into = encodeUtf8 ? emulateEncodeInto(encodeUtf8) : getTextEncoding().encodeUtf8Into;
    this.buffer = EMPTY_BUFFER;
    this.viewCache = EMPTY_VIEW;
    this.pos = 0;
  }
  ensureCapacity(size) {
    const required = this.pos + size;
    if (required > this.buffer.length) {
      let newLen = this.buffer.length || INITIAL_SIZE;
      while (newLen < required)
        newLen *= 2;
      const newBuf = new Uint8Array(newLen);
      if (this.pos > 0)
        newBuf.set(this.buffer);
      this.buffer = newBuf;
    }
  }
  /**
   * The DataView over `buffer`, rebuilt only if the buffer has grown since it
   * was last used.
   */
  view() {
    const bytes = this.buffer;
    const view = this.viewCache;
    if (view.byteLength === bytes.byteLength)
      return view;
    const newView = new DataView(bytes.buffer);
    this.viewCache = newView;
    return newView;
  }
  /**
   * Return all bytes written and reset this writer.
   */
  finish() {
    const result = this.buffer.slice(0, this.pos);
    this.pos = 0;
    this.stackPos = [];
    return result;
  }
  /**
   * Start a new fork for length-delimited data like a message
   * or a packed repeated field.
   *
   * Must be joined later with `join()`.
   */
  fork() {
    this.stackPos.push(this.pos);
    this.ensureCapacity(DEFAULT_LEN_PREFIX_SIZE);
    this.buffer[this.pos++] = 0;
    return this;
  }
  /**
   * Join the last fork. Write its length and bytes, then
   * return to the previous state.
   */
  join() {
    const forkPos = this.stackPos.pop();
    if (forkPos === void 0)
      throw new Error("invalid state, fork stack empty");
    const len = this.pos - forkPos - DEFAULT_LEN_PREFIX_SIZE;
    const lenPrefixSize = varint32Size(len);
    if (lenPrefixSize > DEFAULT_LEN_PREFIX_SIZE) {
      this.ensureCapacity(lenPrefixSize - DEFAULT_LEN_PREFIX_SIZE);
      this.buffer.copyWithin(forkPos + lenPrefixSize, forkPos + DEFAULT_LEN_PREFIX_SIZE, this.pos);
    }
    this.pos = forkPos;
    this.uint32(len);
    this.pos += len;
    return this;
  }
  /**
   * Writes a tag (field number and wire type).
   *
   * Equivalent to `uint32( (fieldNo << 3 | type) >>> 0 )`.
   *
   * Generated code should compute the tag ahead of time and call `uint32()`.
   */
  tag(fieldNo, type) {
    return this.uint32((fieldNo << 3 | type) >>> 0);
  }
  /**
   * Write a chunk of raw bytes.
   */
  raw(chunk) {
    this.ensureCapacity(chunk.length);
    this.buffer.set(chunk, this.pos);
    this.pos += chunk.length;
    return this;
  }
  /**
   * Write a `uint32` value, an unsigned 32 bit varint.
   */
  uint32(value) {
    assertUInt32(value);
    this.ensureCapacity(5);
    if (value < 128) {
      this.buffer[this.pos++] = value;
      return this;
    }
    while (value > 127) {
      this.buffer[this.pos++] = value & 127 | 128;
      value >>>= 7;
    }
    this.buffer[this.pos++] = value;
    return this;
  }
  /**
   * Write a `int32` value, a signed 32 bit varint.
   */
  int32(value) {
    assertInt32(value);
    if (value >= 0) {
      return this.uint32(value);
    }
    this.ensureCapacity(10);
    for (let i = 0; i < 9; i++) {
      this.buffer[this.pos++] = value & 127 | 128;
      value >>= 7;
    }
    this.buffer[this.pos++] = 1;
    return this;
  }
  /**
   * Write a `bool` value, a varint.
   */
  bool(value) {
    this.ensureCapacity(1);
    this.buffer[this.pos++] = value ? 1 : 0;
    return this;
  }
  /**
   * Write a `bytes` value, length-delimited arbitrary data.
   */
  bytes(value) {
    this.uint32(value.byteLength);
    return this.raw(value);
  }
  /**
   * Write a `string` value, length-delimited data converted to UTF-8 text.
   */
  string(value) {
    if (typeof value !== "string") {
      value = String(value);
    }
    const len = value.length;
    if (len <= ASCII_MAX_LENGTH) {
      this.ensureCapacity(len + 1);
      const ascii = this.buffer;
      let pos = this.pos;
      ascii[pos++] = len;
      let i = 0;
      for (; i < len; i++) {
        const code = value.charCodeAt(i);
        if (code > 127)
          break;
        ascii[pos++] = code;
      }
      if (i == len) {
        this.pos = pos;
        return this;
      }
    }
    this.ensureCapacity(len * 3 + 5);
    const lenPrefixSizeGuess = varint32Size(len);
    const buf = this.buffer;
    const start = this.pos;
    const { written } = this.encodeUtf8Into(value, buf.subarray(start + lenPrefixSizeGuess));
    const lenPrefixSize = varint32Size(written);
    if (lenPrefixSize != lenPrefixSizeGuess) {
      buf.copyWithin(start + lenPrefixSize, start + lenPrefixSizeGuess, start + lenPrefixSizeGuess + written);
    }
    this.uint32(written);
    this.pos += written;
    return this;
  }
  /**
   * Write a `float` value, 32-bit floating point number.
   */
  float(value) {
    assertFloat32(value);
    this.ensureCapacity(4);
    this.view().setFloat32(this.pos, value, true);
    this.pos += 4;
    return this;
  }
  /**
   * Write a `double` value, a 64-bit floating point number.
   */
  double(value) {
    this.ensureCapacity(8);
    this.view().setFloat64(this.pos, value, true);
    this.pos += 8;
    return this;
  }
  /**
   * Write a `fixed32` value, an unsigned, fixed-length 32-bit integer.
   */
  fixed32(value) {
    assertUInt32(value);
    this.ensureCapacity(4);
    this.view().setUint32(this.pos, value, true);
    this.pos += 4;
    return this;
  }
  /**
   * Write a `sfixed32` value, a signed, fixed-length 32-bit integer.
   */
  sfixed32(value) {
    assertInt32(value);
    this.ensureCapacity(4);
    this.view().setInt32(this.pos, value, true);
    this.pos += 4;
    return this;
  }
  /**
   * Write a `sint32` value, a signed, zigzag-encoded 32-bit varint.
   */
  sint32(value) {
    assertInt32(value);
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
  }
  /**
   * Write a `sfixed64` value, a signed, fixed-length 64-bit integer.
   */
  sfixed64(value) {
    const tc = protoInt64.enc(value);
    this.ensureCapacity(8);
    const view = this.view();
    view.setInt32(this.pos, tc.lo, true);
    view.setInt32(this.pos + 4, tc.hi, true);
    this.pos += 8;
    return this;
  }
  /**
   * Write a `fixed64` value, an unsigned, fixed-length 64 bit integer.
   */
  fixed64(value) {
    const tc = protoInt64.uEnc(value);
    this.ensureCapacity(8);
    const view = this.view();
    view.setInt32(this.pos, tc.lo, true);
    view.setInt32(this.pos + 4, tc.hi, true);
    this.pos += 8;
    return this;
  }
  /**
   * Write a `int64` value, a signed 64-bit varint.
   */
  int64(value) {
    const tc = protoInt64.enc(value);
    return this.writeVarint64(tc.lo, tc.hi);
  }
  /**
   * Write a `sint64` value, a signed, zig-zag-encoded 64-bit varint.
   */
  sint64(value) {
    const tc = protoInt64.enc(value), sign = tc.hi >> 31, lo = tc.lo << 1 ^ sign, hi = (tc.hi << 1 | tc.lo >>> 31) ^ sign;
    return this.writeVarint64(lo, hi);
  }
  /**
   * Write a `uint64` value, an unsigned 64-bit varint.
   */
  uint64(value) {
    const tc = protoInt64.uEnc(value);
    return this.writeVarint64(tc.lo, tc.hi);
  }
  /**
   * Write a 64-bit varint directly into the buffer. Accepts the value as
   * split low/high 32-bit words.
   *
   * Ported from varint64write() to avoid the intermediate number[] buffer.
   * See https://github.com/protocolbuffers/protobuf/blob/8a71927d74a4ce34efe2d8769fda198f52d20d12/js/experimental/runtime/kernel/writer.js#L344
   */
  writeVarint64(lo, hi) {
    this.ensureCapacity(10);
    const buf = this.buffer;
    let pos = this.pos;
    for (let i = 0; i < 28; i = i + 7) {
      const shift = lo >>> i;
      const hasNext = !(shift >>> 7 == 0 && hi == 0);
      buf[pos++] = (hasNext ? shift | 128 : shift) & 255;
      if (!hasNext) {
        this.pos = pos;
        return this;
      }
    }
    const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
    const hasMoreBits = !(hi >> 3 == 0);
    buf[pos++] = (hasMoreBits ? splitBits | 128 : splitBits) & 255;
    if (!hasMoreBits) {
      this.pos = pos;
      return this;
    }
    for (let i = 3; i < 31; i = i + 7) {
      const shift = hi >>> i;
      const hasNext = !(shift >>> 7 == 0);
      buf[pos++] = (hasNext ? shift | 128 : shift) & 255;
      if (!hasNext) {
        this.pos = pos;
        return this;
      }
    }
    buf[pos++] = hi >>> 31 & 1;
    this.pos = pos;
    return this;
  }
};
var INITIAL_SIZE = 128;
var DEFAULT_LEN_PREFIX_SIZE = 1;
var EMPTY_BUFFER = new Uint8Array(0);
var EMPTY_VIEW = new DataView(EMPTY_BUFFER.buffer);
var ASCII_MAX_LENGTH = 32;
function varint32Size(value) {
  if (value < 128)
    return 1;
  if (value < 16384)
    return 2;
  if (value < 2097152)
    return 3;
  if (value < 268435456)
    return 4;
  return 5;
}
var BinaryReader = class {
  constructor(buf, decodeUtf8 = getTextEncoding().decodeUtf8) {
    this.decodeUtf8 = decodeUtf8;
    this.varint64Lo = 0;
    this.varint64Hi = 0;
    this.varint64 = varint64read;
    this.uint32 = varint32read;
    this.buf = buf;
    this.len = buf.length;
    this.pos = 0;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  /**
   * Reads a tag - field number and wire type. Tags are uint32 varints; values
   * that do not fit in uint32 are rejected.
   */
  tag() {
    const start = this.pos;
    const tag = this.uint32();
    const bytesRead = this.pos - start;
    if (bytesRead > 5 || bytesRead == 5 && this.buf[this.pos - 1] > 15) {
      throw new Error("illegal tag: varint overflows uint32");
    }
    const fieldNo = tag >>> 3;
    const wireType = tag & 7;
    if (fieldNo <= 0 || wireType > 5) {
      throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
    }
    return [fieldNo, wireType];
  }
  /**
   * Skip one element and return the skipped data.
   *
   * When skipping StartGroup, provide the tags field number to check for
   * matching field number in the EndGroup tag. Recursion into nested groups
   * is guarded by the `recursionLimit` argument: When the limit is reached,
   * this method throws.
   */
  skip(wireType, fieldNo, recursionLimit = 100) {
    let start = this.pos;
    switch (wireType) {
      case WireType.Varint:
        while (this.buf[this.pos++] & 128) {
        }
        break;
      // @ts-ignore TS7029: Fallthrough case in switch -- ignore instead of expect-error for compiler settings without noFallthroughCasesInSwitch: true
      case WireType.Bit64:
        this.pos += 4;
      case WireType.Bit32:
        this.pos += 4;
        break;
      case WireType.LengthDelimited:
        let len = this.uint32();
        this.pos += len;
        break;
      case WireType.StartGroup:
        if (recursionLimit <= 0) {
          throw new Error("maximum recursion depth reached");
        }
        for (; ; ) {
          const [fn, wt] = this.tag();
          if (wt === WireType.EndGroup) {
            if (fieldNo !== void 0 && fn !== fieldNo) {
              throw new Error("invalid end group tag");
            }
            break;
          }
          this.skip(wt, fn, recursionLimit - 1);
        }
        break;
      default:
        throw new Error("cant skip wire type " + wireType);
    }
    this.assertBounds();
    return this.buf.subarray(start, this.pos);
  }
  /**
   * Throws error if position in byte array is out of range.
   */
  assertBounds() {
    if (this.pos > this.len)
      throw new RangeError("premature EOF");
  }
  /**
   * Read a `int32` field, a signed 32 bit varint.
   */
  int32() {
    return this.uint32() | 0;
  }
  /**
   * Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
   */
  sint32() {
    let zze = this.uint32();
    return zze >>> 1 ^ -(zze & 1);
  }
  /**
   * Read a `int64` field, a signed 64-bit varint.
   */
  int64() {
    this.varint64();
    return protoInt64.dec(this.varint64Lo, this.varint64Hi);
  }
  /**
   * Read a `uint64` field, an unsigned 64-bit varint.
   */
  uint64() {
    this.varint64();
    return protoInt64.uDec(this.varint64Lo, this.varint64Hi);
  }
  /**
   * Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
   */
  sint64() {
    this.varint64();
    let lo = this.varint64Lo;
    let hi = this.varint64Hi;
    let s = -(lo & 1);
    lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
    hi = hi >>> 1 ^ s;
    return protoInt64.dec(lo, hi);
  }
  /**
   * Read a `bool` field, a variant.
   */
  bool() {
    const b = this.buf[this.pos];
    if (b < 128) {
      this.pos++;
      return b !== 0;
    }
    this.varint64();
    return this.varint64Lo !== 0 || this.varint64Hi !== 0;
  }
  /**
   * Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
   */
  fixed32() {
    return this.view.getUint32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
   */
  sfixed32() {
    return this.view.getInt32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
   */
  fixed64() {
    return protoInt64.uDec(this.sfixed32(), this.sfixed32());
  }
  /**
   * Read a `fixed64` field, a signed, fixed-length 64-bit integer.
   */
  sfixed64() {
    return protoInt64.dec(this.sfixed32(), this.sfixed32());
  }
  /**
   * Read a `float` field, 32-bit floating point number.
   */
  float() {
    return this.view.getFloat32((this.pos += 4) - 4, true);
  }
  /**
   * Read a `double` field, a 64-bit floating point number.
   */
  double() {
    return this.view.getFloat64((this.pos += 8) - 8, true);
  }
  /**
   * Read a `bytes` field, length-delimited arbitrary data.
   */
  bytes() {
    let len = this.uint32(), start = this.pos;
    this.pos += len;
    this.assertBounds();
    return this.buf.subarray(start, start + len);
  }
  /**
   * Read a `string` field, length-delimited data converted to UTF-8 text. If
   * `strict` is true, throw on invalid UTF-8 instead of substituting U+FFFD.
   */
  string(strict) {
    const bytes = this.bytes();
    const len = bytes.length;
    if (len <= ASCII_MAX_LENGTH) {
      const codes = new Array(len);
      for (let i = 0; i < len; i++) {
        const byte = bytes[i];
        if (byte > 127) {
          return this.decodeUtf8(bytes, strict);
        }
        codes[i] = byte;
      }
      return String.fromCharCode.apply(String, codes);
    }
    return this.decodeUtf8(bytes, strict);
  }
};
function assertInt32(arg) {
  if (typeof arg == "string") {
    arg = Number(arg);
  } else if (typeof arg != "number") {
    throw new Error("invalid int32: " + typeof arg);
  }
  if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
    throw new Error("invalid int32: " + arg);
}
function assertUInt32(arg) {
  if (typeof arg == "string") {
    arg = Number(arg);
  } else if (typeof arg != "number") {
    throw new Error("invalid uint32: " + typeof arg);
  }
  if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
    throw new Error("invalid uint32: " + arg);
}
function assertFloat32(arg) {
  if (typeof arg == "string") {
    const o = arg;
    arg = Number(arg);
    if (Number.isNaN(arg) && o !== "NaN") {
      throw new Error("invalid float32: " + o);
    }
  } else if (typeof arg != "number") {
    throw new Error("invalid float32: " + typeof arg);
  }
  if (!Number.isFinite(Math.fround(arg)) && Number.isFinite(arg)) {
    throw new Error("invalid float32: " + arg);
  }
}

// src/generated/tupago/api/v1/payment.ts
function createBaseGetClienteRequest() {
  return { id: 0n };
}
var GetClienteRequest = {
  encode(message, writer = new BinaryWriter()) {
    if (message.id !== 0n) {
      if (BigInt.asIntN(64, message.id) !== message.id) {
        throw new globalThis.Error("value provided for field message.id of type int64 too large");
      }
      writer.uint32(8).int64(message.id);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseGetClienteRequest();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 8) {
              break;
            }
            message.id = reader.int64();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return { id: isSet(object.id) ? BigInt(object.id) : 0n };
  },
  toJSON(message) {
    const obj = {};
    if (message.id !== 0n) {
      obj.id = message.id.toString();
    }
    return obj;
  },
  create(base) {
    return GetClienteRequest.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseGetClienteRequest();
    message.id = object.id !== void 0 && object.id !== null ? BigInt(object.id) : 0n;
    return message;
  }
};
function createBaseGetCatalogoRequest() {
  return { claveInstitucion: "" };
}
var GetCatalogoRequest = {
  encode(message, writer = new BinaryWriter()) {
    if (message.claveInstitucion !== "") {
      writer.uint32(10).string(message.claveInstitucion);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseGetCatalogoRequest();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 10) {
              break;
            }
            message.claveInstitucion = reader.string();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      claveInstitucion: isSet(object.claveInstitucion) ? globalThis.String(object.claveInstitucion) : isSet(object.clave_institucion) ? globalThis.String(object.clave_institucion) : ""
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.claveInstitucion !== "") {
      obj.claveInstitucion = message.claveInstitucion;
    }
    return obj;
  },
  create(base) {
    return GetCatalogoRequest.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseGetCatalogoRequest();
    message.claveInstitucion = object.claveInstitucion ?? "";
    return message;
  }
};
function createBaseGetStatusRequest() {
  return { idc: "", idCuenta: 0n };
}
var GetStatusRequest = {
  encode(message, writer = new BinaryWriter()) {
    if (message.idc !== "") {
      writer.uint32(10).string(message.idc);
    }
    if (message.idCuenta !== 0n) {
      if (BigInt.asIntN(64, message.idCuenta) !== message.idCuenta) {
        throw new globalThis.Error("value provided for field message.idCuenta of type int64 too large");
      }
      writer.uint32(16).int64(message.idCuenta);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseGetStatusRequest();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 10) {
              break;
            }
            message.idc = reader.string();
            continue;
          }
          case 2: {
            if (tag !== 16) {
              break;
            }
            message.idCuenta = reader.int64();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      idc: isSet(object.idc) ? globalThis.String(object.idc) : "",
      idCuenta: isSet(object.idCuenta) ? BigInt(object.idCuenta) : isSet(object.id_cuenta) ? BigInt(object.id_cuenta) : 0n
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.idc !== "") {
      obj.idc = message.idc;
    }
    if (message.idCuenta !== 0n) {
      obj.idCuenta = message.idCuenta.toString();
    }
    return obj;
  },
  create(base) {
    return GetStatusRequest.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseGetStatusRequest();
    message.idc = object.idc ?? "";
    message.idCuenta = object.idCuenta !== void 0 && object.idCuenta !== null ? BigInt(object.idCuenta) : 0n;
    return message;
  }
};
function createBaseCreateQrRequest() {
  return {
    idCuenta: 0n,
    monto: 0,
    concepto: "",
    referenciaNumerica: 0,
    nombreCliente: "",
    email: "",
    tipoPago: 0,
    vigencia: 0,
    idempotencyKey: ""
  };
}
var CreateQrRequest = {
  encode(message, writer = new BinaryWriter()) {
    if (message.idCuenta !== 0n) {
      if (BigInt.asIntN(64, message.idCuenta) !== message.idCuenta) {
        throw new globalThis.Error("value provided for field message.idCuenta of type int64 too large");
      }
      writer.uint32(8).int64(message.idCuenta);
    }
    if (message.monto !== 0) {
      writer.uint32(17).double(message.monto);
    }
    if (message.concepto !== "") {
      writer.uint32(26).string(message.concepto);
    }
    if (message.referenciaNumerica !== 0) {
      writer.uint32(32).int32(message.referenciaNumerica);
    }
    if (message.nombreCliente !== "") {
      writer.uint32(42).string(message.nombreCliente);
    }
    if (message.email !== "") {
      writer.uint32(50).string(message.email);
    }
    if (message.tipoPago !== 0) {
      writer.uint32(56).int32(message.tipoPago);
    }
    if (message.vigencia !== 0) {
      writer.uint32(64).int32(message.vigencia);
    }
    if (message.idempotencyKey !== "") {
      writer.uint32(74).string(message.idempotencyKey);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseCreateQrRequest();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 8) {
              break;
            }
            message.idCuenta = reader.int64();
            continue;
          }
          case 2: {
            if (tag !== 17) {
              break;
            }
            message.monto = reader.double();
            continue;
          }
          case 3: {
            if (tag !== 26) {
              break;
            }
            message.concepto = reader.string();
            continue;
          }
          case 4: {
            if (tag !== 32) {
              break;
            }
            message.referenciaNumerica = reader.int32();
            continue;
          }
          case 5: {
            if (tag !== 42) {
              break;
            }
            message.nombreCliente = reader.string();
            continue;
          }
          case 6: {
            if (tag !== 50) {
              break;
            }
            message.email = reader.string();
            continue;
          }
          case 7: {
            if (tag !== 56) {
              break;
            }
            message.tipoPago = reader.int32();
            continue;
          }
          case 8: {
            if (tag !== 64) {
              break;
            }
            message.vigencia = reader.int32();
            continue;
          }
          case 9: {
            if (tag !== 74) {
              break;
            }
            message.idempotencyKey = reader.string();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      idCuenta: isSet(object.idCuenta) ? BigInt(object.idCuenta) : isSet(object.id_cuenta) ? BigInt(object.id_cuenta) : 0n,
      monto: isSet(object.monto) ? globalThis.Number(object.monto) : 0,
      concepto: isSet(object.concepto) ? globalThis.String(object.concepto) : "",
      referenciaNumerica: isSet(object.referenciaNumerica) ? globalThis.Number(object.referenciaNumerica) : isSet(object.referencia_numerica) ? globalThis.Number(object.referencia_numerica) : 0,
      nombreCliente: isSet(object.nombreCliente) ? globalThis.String(object.nombreCliente) : isSet(object.nombre_cliente) ? globalThis.String(object.nombre_cliente) : "",
      email: isSet(object.email) ? globalThis.String(object.email) : "",
      tipoPago: isSet(object.tipoPago) ? globalThis.Number(object.tipoPago) : isSet(object.tipo_pago) ? globalThis.Number(object.tipo_pago) : 0,
      vigencia: isSet(object.vigencia) ? globalThis.Number(object.vigencia) : 0,
      idempotencyKey: isSet(object.idempotencyKey) ? globalThis.String(object.idempotencyKey) : isSet(object.idempotency_key) ? globalThis.String(object.idempotency_key) : ""
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.idCuenta !== 0n) {
      obj.idCuenta = message.idCuenta.toString();
    }
    if (message.monto !== 0) {
      obj.monto = message.monto;
    }
    if (message.concepto !== "") {
      obj.concepto = message.concepto;
    }
    if (message.referenciaNumerica !== 0) {
      obj.referenciaNumerica = Math.round(message.referenciaNumerica);
    }
    if (message.nombreCliente !== "") {
      obj.nombreCliente = message.nombreCliente;
    }
    if (message.email !== "") {
      obj.email = message.email;
    }
    if (message.tipoPago !== 0) {
      obj.tipoPago = Math.round(message.tipoPago);
    }
    if (message.vigencia !== 0) {
      obj.vigencia = Math.round(message.vigencia);
    }
    if (message.idempotencyKey !== "") {
      obj.idempotencyKey = message.idempotencyKey;
    }
    return obj;
  },
  create(base) {
    return CreateQrRequest.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseCreateQrRequest();
    message.idCuenta = object.idCuenta !== void 0 && object.idCuenta !== null ? BigInt(object.idCuenta) : 0n;
    message.monto = object.monto ?? 0;
    message.concepto = object.concepto ?? "";
    message.referenciaNumerica = object.referenciaNumerica ?? 0;
    message.nombreCliente = object.nombreCliente ?? "";
    message.email = object.email ?? "";
    message.tipoPago = object.tipoPago ?? 0;
    message.vigencia = object.vigencia ?? 0;
    message.idempotencyKey = object.idempotencyKey ?? "";
    return message;
  }
};
function createBaseCreateTelefonicoRequest() {
  return { key: "", monto: 0, concepto: "", referenciaNumerica: 0, numeroCelular: "", vigencia: 0, idempotencyKey: "" };
}
var CreateTelefonicoRequest = {
  encode(message, writer = new BinaryWriter()) {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.monto !== 0) {
      writer.uint32(17).double(message.monto);
    }
    if (message.concepto !== "") {
      writer.uint32(26).string(message.concepto);
    }
    if (message.referenciaNumerica !== 0) {
      writer.uint32(32).int32(message.referenciaNumerica);
    }
    if (message.numeroCelular !== "") {
      writer.uint32(42).string(message.numeroCelular);
    }
    if (message.vigencia !== 0) {
      writer.uint32(48).int32(message.vigencia);
    }
    if (message.idempotencyKey !== "") {
      writer.uint32(58).string(message.idempotencyKey);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseCreateTelefonicoRequest();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 10) {
              break;
            }
            message.key = reader.string();
            continue;
          }
          case 2: {
            if (tag !== 17) {
              break;
            }
            message.monto = reader.double();
            continue;
          }
          case 3: {
            if (tag !== 26) {
              break;
            }
            message.concepto = reader.string();
            continue;
          }
          case 4: {
            if (tag !== 32) {
              break;
            }
            message.referenciaNumerica = reader.int32();
            continue;
          }
          case 5: {
            if (tag !== 42) {
              break;
            }
            message.numeroCelular = reader.string();
            continue;
          }
          case 6: {
            if (tag !== 48) {
              break;
            }
            message.vigencia = reader.int32();
            continue;
          }
          case 7: {
            if (tag !== 58) {
              break;
            }
            message.idempotencyKey = reader.string();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      key: isSet(object.key) ? globalThis.String(object.key) : "",
      monto: isSet(object.monto) ? globalThis.Number(object.monto) : 0,
      concepto: isSet(object.concepto) ? globalThis.String(object.concepto) : "",
      referenciaNumerica: isSet(object.referenciaNumerica) ? globalThis.Number(object.referenciaNumerica) : isSet(object.referencia_numerica) ? globalThis.Number(object.referencia_numerica) : 0,
      numeroCelular: isSet(object.numeroCelular) ? globalThis.String(object.numeroCelular) : isSet(object.numero_celular) ? globalThis.String(object.numero_celular) : "",
      vigencia: isSet(object.vigencia) ? globalThis.Number(object.vigencia) : 0,
      idempotencyKey: isSet(object.idempotencyKey) ? globalThis.String(object.idempotencyKey) : isSet(object.idempotency_key) ? globalThis.String(object.idempotency_key) : ""
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.monto !== 0) {
      obj.monto = message.monto;
    }
    if (message.concepto !== "") {
      obj.concepto = message.concepto;
    }
    if (message.referenciaNumerica !== 0) {
      obj.referenciaNumerica = Math.round(message.referenciaNumerica);
    }
    if (message.numeroCelular !== "") {
      obj.numeroCelular = message.numeroCelular;
    }
    if (message.vigencia !== 0) {
      obj.vigencia = Math.round(message.vigencia);
    }
    if (message.idempotencyKey !== "") {
      obj.idempotencyKey = message.idempotencyKey;
    }
    return obj;
  },
  create(base) {
    return CreateTelefonicoRequest.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseCreateTelefonicoRequest();
    message.key = object.key ?? "";
    message.monto = object.monto ?? 0;
    message.concepto = object.concepto ?? "";
    message.referenciaNumerica = object.referenciaNumerica ?? 0;
    message.numeroCelular = object.numeroCelular ?? "";
    message.vigencia = object.vigencia ?? 0;
    message.idempotencyKey = object.idempotencyKey ?? "";
    return message;
  }
};
function createBaseClientePerfil() {
  return { cliente: void 0, catalogoInstitucion: void 0 };
}
var ClientePerfil = {
  encode(message, writer = new BinaryWriter()) {
    if (message.cliente !== void 0) {
      Cliente.encode(message.cliente, writer.uint32(10).fork()).join();
    }
    if (message.catalogoInstitucion !== void 0) {
      CatalogoInstitucion.encode(message.catalogoInstitucion, writer.uint32(18).fork()).join();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseClientePerfil();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 10) {
              break;
            }
            message.cliente = Cliente.decode(reader, reader.uint32());
            continue;
          }
          case 2: {
            if (tag !== 18) {
              break;
            }
            message.catalogoInstitucion = CatalogoInstitucion.decode(reader, reader.uint32());
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      cliente: isSet(object.cliente) ? Cliente.fromJSON(object.cliente) : void 0,
      catalogoInstitucion: isSet(object.catalogoInstitucion) ? CatalogoInstitucion.fromJSON(object.catalogoInstitucion) : isSet(object.catalogo_institucion) ? CatalogoInstitucion.fromJSON(object.catalogo_institucion) : void 0
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.cliente !== void 0) {
      obj.cliente = Cliente.toJSON(message.cliente);
    }
    if (message.catalogoInstitucion !== void 0) {
      obj.catalogoInstitucion = CatalogoInstitucion.toJSON(message.catalogoInstitucion);
    }
    return obj;
  },
  create(base) {
    return ClientePerfil.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseClientePerfil();
    message.cliente = object.cliente !== void 0 && object.cliente !== null ? Cliente.fromPartial(object.cliente) : void 0;
    message.catalogoInstitucion = object.catalogoInstitucion !== void 0 && object.catalogoInstitucion !== null ? CatalogoInstitucion.fromPartial(object.catalogoInstitucion) : void 0;
    return message;
  }
};
function createBaseCliente() {
  return { id: 0n, nombre: "", claveInstitucion: "", key: "" };
}
var Cliente = {
  encode(message, writer = new BinaryWriter()) {
    if (message.id !== 0n) {
      if (BigInt.asIntN(64, message.id) !== message.id) {
        throw new globalThis.Error("value provided for field message.id of type int64 too large");
      }
      writer.uint32(8).int64(message.id);
    }
    if (message.nombre !== "") {
      writer.uint32(18).string(message.nombre);
    }
    if (message.claveInstitucion !== "") {
      writer.uint32(26).string(message.claveInstitucion);
    }
    if (message.key !== "") {
      writer.uint32(34).string(message.key);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseCliente();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 8) {
              break;
            }
            message.id = reader.int64();
            continue;
          }
          case 2: {
            if (tag !== 18) {
              break;
            }
            message.nombre = reader.string();
            continue;
          }
          case 3: {
            if (tag !== 26) {
              break;
            }
            message.claveInstitucion = reader.string();
            continue;
          }
          case 4: {
            if (tag !== 34) {
              break;
            }
            message.key = reader.string();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      id: isSet(object.id) ? BigInt(object.id) : 0n,
      nombre: isSet(object.nombre) ? globalThis.String(object.nombre) : "",
      claveInstitucion: isSet(object.claveInstitucion) ? globalThis.String(object.claveInstitucion) : isSet(object.clave_institucion) ? globalThis.String(object.clave_institucion) : "",
      key: isSet(object.key) ? globalThis.String(object.key) : ""
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.id !== 0n) {
      obj.id = message.id.toString();
    }
    if (message.nombre !== "") {
      obj.nombre = message.nombre;
    }
    if (message.claveInstitucion !== "") {
      obj.claveInstitucion = message.claveInstitucion;
    }
    if (message.key !== "") {
      obj.key = message.key;
    }
    return obj;
  },
  create(base) {
    return Cliente.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseCliente();
    message.id = object.id !== void 0 && object.id !== null ? BigInt(object.id) : 0n;
    message.nombre = object.nombre ?? "";
    message.claveInstitucion = object.claveInstitucion ?? "";
    message.key = object.key ?? "";
    return message;
  }
};
function createBaseCatalogoInstitucion() {
  return { id: 0n, claveInstitucion: "", nombreCorto: "" };
}
var CatalogoInstitucion = {
  encode(message, writer = new BinaryWriter()) {
    if (message.id !== 0n) {
      if (BigInt.asIntN(64, message.id) !== message.id) {
        throw new globalThis.Error("value provided for field message.id of type int64 too large");
      }
      writer.uint32(8).int64(message.id);
    }
    if (message.claveInstitucion !== "") {
      writer.uint32(18).string(message.claveInstitucion);
    }
    if (message.nombreCorto !== "") {
      writer.uint32(26).string(message.nombreCorto);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseCatalogoInstitucion();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 8) {
              break;
            }
            message.id = reader.int64();
            continue;
          }
          case 2: {
            if (tag !== 18) {
              break;
            }
            message.claveInstitucion = reader.string();
            continue;
          }
          case 3: {
            if (tag !== 26) {
              break;
            }
            message.nombreCorto = reader.string();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return {
      id: isSet(object.id) ? BigInt(object.id) : 0n,
      claveInstitucion: isSet(object.claveInstitucion) ? globalThis.String(object.claveInstitucion) : isSet(object.clave_institucion) ? globalThis.String(object.clave_institucion) : "",
      nombreCorto: isSet(object.nombreCorto) ? globalThis.String(object.nombreCorto) : isSet(object.nombre_corto) ? globalThis.String(object.nombre_corto) : ""
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.id !== 0n) {
      obj.id = message.id.toString();
    }
    if (message.claveInstitucion !== "") {
      obj.claveInstitucion = message.claveInstitucion;
    }
    if (message.nombreCorto !== "") {
      obj.nombreCorto = message.nombreCorto;
    }
    return obj;
  },
  create(base) {
    return CatalogoInstitucion.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseCatalogoInstitucion();
    message.id = object.id !== void 0 && object.id !== null ? BigInt(object.id) : 0n;
    message.claveInstitucion = object.claveInstitucion ?? "";
    message.nombreCorto = object.nombreCorto ?? "";
    return message;
  }
};
function createBaseJsonResponse() {
  return { json: "" };
}
var JsonResponse = {
  encode(message, writer = new BinaryWriter()) {
    if (message.json !== "") {
      writer.uint32(10).string(message.json);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const previousRecursionDepth = reader.__tsProtoDecodeDepth ?? 0;
    if (previousRecursionDepth >= 100) {
      throw new globalThis.Error("protobuf decode recursion limit exceeded");
    }
    reader.__tsProtoDecodeDepth = previousRecursionDepth + 1;
    try {
      const end = length === void 0 ? reader.len : reader.pos + length;
      const message = createBaseJsonResponse();
      while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
          case 1: {
            if (tag !== 10) {
              break;
            }
            message.json = reader.string();
            continue;
          }
        }
        if ((tag & 7) === 4 || tag === 0) {
          break;
        }
        reader.skip(tag & 7);
      }
      return message;
    } finally {
      reader.__tsProtoDecodeDepth = previousRecursionDepth;
    }
  },
  fromJSON(object) {
    return { json: isSet(object.json) ? globalThis.String(object.json) : "" };
  },
  toJSON(message) {
    const obj = {};
    if (message.json !== "") {
      obj.json = message.json;
    }
    return obj;
  },
  create(base) {
    return JsonResponse.fromPartial(base ?? {});
  },
  fromPartial(object) {
    const message = createBaseJsonResponse();
    message.json = object.json ?? "";
    return message;
  }
};
function isSet(value) {
  return value !== null && value !== void 0;
}

// src/security/TlsConfig.ts
var TlsConfig = class _TlsConfig {
  trustCertChainPath;
  trustCertChainBytes;
  useSystemTrust;
  constructor(opts) {
    this.trustCertChainPath = opts.trustCertChainPath;
    this.trustCertChainBytes = opts.trustCertChainBytes;
    this.useSystemTrust = opts.useSystemTrust;
  }
  /** Use the runtime's default CA trust store (typical for public CAs). */
  static systemTrust() {
    return new _TlsConfig({ useSystemTrust: true });
  }
  /** Trust an explicit PEM certificate chain file. */
  static trustCertChainFile(path) {
    if (!path) throw new Error("trustCertChainFile requires a non-empty path");
    return new _TlsConfig({ trustCertChainPath: path, useSystemTrust: false });
  }
  /** Trust an explicit PEM certificate chain supplied in memory. */
  static trustCertChainBytes(bytes) {
    if (!bytes || bytes.length === 0) throw new Error("trustCertChainBytes requires non-empty bytes");
    return new _TlsConfig({ trustCertChainBytes: bytes, useSystemTrust: false });
  }
};

// src/security/ChannelSecurity.ts
var grpc = __toESM(require("@grpc/grpc-js"), 1);
var import_node_fs = require("fs");
var ChannelSecurity = class _ChannelSecurity {
  constructor() {
  }
  /** @return true if the host resolves to a loopback address (127.0.0.1 / ::1 / localhost). */
  static isLoopback(host) {
    if (!host) return false;
    const h = hostOf(host);
    if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") {
      return true;
    }
    return false;
  }
  /** Plaintext channel for LOCAL development only (loopback target). Fails closed otherwise. */
  static plaintextLoopback(target) {
    if (!_ChannelSecurity.isLoopback(hostOf(target))) {
      throw new Error(
        `Plaintext channel refused: target '${target}' is not loopback (gate G8). Use TLS.`
      );
    }
    return grpc.credentials.createInsecure();
  }
  /** TLS channel credentials for any target (required for non-loopback). */
  static tls(tls) {
    let rootCerts;
    try {
      if (tls.useSystemTrust) {
        rootCerts = void 0;
      } else if (tls.trustCertChainBytes) {
        rootCerts = Buffer.from(tls.trustCertChainBytes);
      } else if (tls.trustCertChainPath) {
        rootCerts = Buffer.from((0, import_node_fs.readFileSync)(tls.trustCertChainPath));
      } else {
        throw new Error("TlsConfig has no usable trust material");
      }
    } catch (e) {
      throw new Error(`Failed to load TLS trust material: ${e.message}`);
    }
    return grpc.credentials.createSsl(rootCerts);
  }
  /**
   * Convenience: choose transport by target. Loopback -> insecure (local dev); otherwise -> TLS.
   */
  static forTarget(target, tls) {
    if (tls) {
      return _ChannelSecurity.tls(tls);
    }
    if (_ChannelSecurity.isLoopback(hostOf(target))) {
      return _ChannelSecurity.plaintextLoopback(target);
    }
    throw new Error(
      `TLS required for non-loopback target '${target}' (gate G8). Provide a TlsConfig.`
    );
  }
};
function hostOf(target) {
  if (!target) return "";
  let t = target;
  const schemeIdx = t.indexOf("://");
  if (schemeIdx >= 0) t = t.substring(schemeIdx + 3);
  if (t.startsWith("/")) t = t.substring(1);
  if (t.startsWith("[")) {
    const end = t.indexOf("]");
    return end > 0 ? t.substring(1, end) : t;
  }
  const colon = t.indexOf(":");
  return colon > 0 ? t.substring(0, colon) : t;
}

// src/error/TupagoException.ts
var grpc2 = __toESM(require("@grpc/grpc-js"), 1);
var PENDING_RECONCILIATION_CODE = "TUPAGO_PENDING_RECONCILIATION";
var TRANSIENT_GRPC_CODES = /* @__PURE__ */ new Set([
  grpc2.status.UNAVAILABLE,
  grpc2.status.DEADLINE_EXCEEDED
]);
function isTransientCode(code) {
  return TRANSIENT_GRPC_CODES.has(code);
}
var TupagoException = class extends Error {
  code;
  codeName;
  description;
  retryable;
  pendingReconciliation;
  cause;
  constructor(opts) {
    super(opts.message);
    this.name = new.target.name;
    this.code = opts.code;
    this.codeName = grpc2.status[opts.code] ?? String(opts.code);
    this.description = opts.description;
    this.retryable = opts.retryable;
    this.pendingReconciliation = opts.pendingReconciliation;
    this.cause = opts.cause;
  }
  /** Whether the SDK is permitted to retry the operation that produced this error. */
  isRetryable() {
    return this.retryable;
  }
  /**
   * True only for the non-transient TUPAGO_PENDING_RECONCILIATION (ABORTED) condition.
   * When set, the caller MUST query status instead of resubmitting (gate G6).
   */
  isPendingReconciliation() {
    return this.pendingReconciliation;
  }
};

// src/error/TupagoStandardExceptions.ts
var TupagoNotFoundException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `NOT_FOUND: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};
var TupagoInvalidArgumentException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `INVALID_ARGUMENT: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};
var TupagoPermissionDeniedException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `PERMISSION_DENIED: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};
var TupagoUnauthenticatedException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `UNAUTHENTICATED: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};
var TupagoAlreadyExistsException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `ALREADY_EXISTS: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};
var TupagoFailedPreconditionException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `FAILED_PRECONDITION: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};
var TupagoInternalException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `INTERNAL: ${description}`, retryable: false, pendingReconciliation: false, cause });
  }
};

// src/error/TupagoTransientException.ts
var grpc3 = __toESM(require("@grpc/grpc-js"), 1);
var TupagoTransientException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `${grpc3.status[code]}: ${description}`, retryable: true, pendingReconciliation: false, cause });
  }
};

// src/error/TupagoAbortedException.ts
var TupagoAbortedException = class extends TupagoException {
  constructor(code, description, cause) {
    super({ code, description, message: `ABORTED: ${description}`, retryable: false, pendingReconciliation: true, cause });
  }
};

// src/error/TupagoUnknownOutcomeException.ts
var grpc4 = __toESM(require("@grpc/grpc-js"), 1);
var TupagoUnknownOutcomeException = class extends TupagoException {
  constructor(code, description, cause) {
    super({
      code,
      description,
      message: `UNKNOWN_OUTCOME: ${grpc4.status[code]}: ${description} \u2014 do not blind-resubmit; reuse the same idempotency_key or query status`,
      retryable: false,
      pendingReconciliation: false,
      cause
    });
  }
};

// src/error/StatusMapper.ts
var grpc5 = __toESM(require("@grpc/grpc-js"), 1);
var StatusMapper = class {
  constructor() {
  }
  static map(err) {
    if (err instanceof TupagoException) {
      return err;
    }
    const serviceError = err;
    const code = typeof serviceError?.code === "number" ? serviceError.code : grpc5.status.UNKNOWN;
    const description = extractDescription(serviceError);
    if (description.includes(PENDING_RECONCILIATION_CODE)) {
      return new TupagoAbortedException(grpc5.status.ABORTED, description, err);
    }
    switch (code) {
      case grpc5.status.UNAUTHENTICATED:
        return new TupagoUnauthenticatedException(code, description, err);
      case grpc5.status.PERMISSION_DENIED:
        return new TupagoPermissionDeniedException(code, description, err);
      case grpc5.status.INVALID_ARGUMENT:
        return new TupagoInvalidArgumentException(code, description, err);
      case grpc5.status.ALREADY_EXISTS:
        return new TupagoAlreadyExistsException(code, description, err);
      case grpc5.status.FAILED_PRECONDITION:
        return new TupagoFailedPreconditionException(code, description, err);
      case grpc5.status.NOT_FOUND:
        return new TupagoNotFoundException(code, description, err);
      case grpc5.status.ABORTED:
        return new TupagoAbortedException(code, description, err);
      case grpc5.status.UNAVAILABLE:
      case grpc5.status.DEADLINE_EXCEEDED:
        return new TupagoTransientException(code, description, err);
      case grpc5.status.INTERNAL:
        return new TupagoInternalException(code, description, err);
      default:
        return new TupagoException({
          code,
          description,
          message: `${grpc5.status[code] ?? code}: ${description}`,
          retryable: isTransientCode(code),
          pendingReconciliation: false,
          cause: err
        });
    }
  }
};
function extractDescription(err) {
  if (!err) return "";
  if (typeof err.details === "string" && err.details.length > 0) {
    return err.details;
  }
  if (typeof err.message === "string" && err.message.length > 0) {
    return err.message;
  }
  return "";
}

// src/retry/NoRetryPolicy.ts
var NoRetryPolicy = class _NoRetryPolicy {
  static INSTANCE = new _NoRetryPolicy();
  shouldRetry(_attempt, _error) {
    return false;
  }
  delayMillis(_attempt) {
    return 0;
  }
};

// src/retry/BackoffRetryPolicy.ts
var import_node_crypto = require("crypto");
var BackoffRetryPolicy = class _BackoffRetryPolicy {
  maxAttempts;
  baseDelayMillis;
  maxDelayMillis;
  constructor(maxAttempts, baseDelayMillis, maxDelayMillis) {
    if (maxAttempts < 1) {
      throw new Error("maxAttempts must be >= 1");
    }
    this.maxAttempts = maxAttempts;
    this.baseDelayMillis = Math.max(1, baseDelayMillis);
    this.maxDelayMillis = Math.max(baseDelayMillis, maxDelayMillis);
  }
  static of(maxAttempts) {
    return new _BackoffRetryPolicy(maxAttempts, 200, 2e3);
  }
  shouldRetry(attempt, error) {
    if (attempt >= this.maxAttempts - 1) {
      return false;
    }
    return error.isRetryable();
  }
  delayMillis(attempt) {
    const exp = this.baseDelayMillis * Math.pow(2, attempt);
    const capped = Math.min(exp, this.maxDelayMillis);
    const jitter = (0, import_node_crypto.randomInt)(0, Math.max(1, Math.floor(capped / 2)));
    return capped + jitter;
  }
};

// src/client/JsonResponseView.ts
var JsonResponseView = class {
  response;
  constructor(response) {
    this.response = response;
  }
  /** The raw JSON payload, exactly as returned by the backend. */
  json() {
    return this.response.json;
  }
  /** Parsed JSON value (throws if the payload is not valid JSON). */
  parsed() {
    return JSON.parse(this.response.json);
  }
  /** Bind the raw JSON to a caller-supplied type via JSON.parse + cast. */
  as() {
    return JSON.parse(this.response.json);
  }
  /** The underlying generated protobuf message. */
  raw() {
    return this.response;
  }
};

// src/transport/grpc.ts
var SERVICE_NAME = "tupago.api.v1.PaymentService";
var AUTHORIZATION = "authorization";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function validateAmount(field, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number (wire type is double); got ${value}`);
  }
}
var GrpcPaymentTransport = class {
  client;
  credentialProvider;
  deadlineMillis;
  readRetryPolicy;
  closed = false;
  constructor(opts) {
    if (!opts.target) throw new Error("target is required");
    if (!opts.credentials) throw new Error("credentials is required");
    const channelCreds = ChannelSecurity.forTarget(opts.target, opts.tls);
    this.client = new grpc6.Client(opts.target, channelCreds, {
      "grpc.max_receive_message_length": 8 * 1024 * 1024,
      "grpc.max_send_message_length": 8 * 1024 * 1024
    });
    this.credentialProvider = opts.credentials;
    this.deadlineMillis = opts.deadlineMillis && opts.deadlineMillis > 0 ? opts.deadlineMillis : 1e4;
    this.readRetryPolicy = opts.readRetryPolicy ?? BackoffRetryPolicy.of(3);
  }
  async getCliente(id, opts) {
    const req = GetClienteRequest.encode({ id }).finish();
    return this.executeRead("GetCliente", req, (b) => ClientePerfil.decode(b), opts);
  }
  async getCatalogo(claveInstitucion, opts) {
    const req = GetCatalogoRequest.encode({ claveInstitucion: claveInstitucion ?? "" }).finish();
    return this.executeRead("GetCatalogo", req, (b) => CatalogoInstitucion.decode(b), opts);
  }
  async getQrStatus(idc, idCuenta, opts) {
    const req = GetStatusRequest.encode({ idc: idc ?? "", idCuenta }).finish();
    return this.executeReadView("GetQrStatus", req, opts);
  }
  async getTelefonicoStatus(idc, idCuenta, opts) {
    const req = GetStatusRequest.encode({ idc: idc ?? "", idCuenta }).finish();
    return this.executeReadView("GetTelefonicoStatus", req, opts);
  }
  async createQr(req, opts) {
    validateAmount("monto", req.monto);
    const wire = CreateQrRequest.encode({
      idCuenta: req.idCuenta,
      monto: req.monto,
      concepto: req.concepto,
      referenciaNumerica: req.referenciaNumerica,
      nombreCliente: req.nombreCliente,
      email: req.email,
      tipoPago: req.tipoPago,
      vigencia: req.vigencia,
      idempotencyKey: req.idempotencyKey
    }).finish();
    return this.executeFinancialView("CreateQr", wire, opts);
  }
  async createTelefonico(req, opts) {
    validateAmount("monto", req.monto);
    const wire = CreateTelefonicoRequest.encode({
      key: req.key,
      monto: req.monto,
      concepto: req.concepto,
      referenciaNumerica: req.referenciaNumerica,
      numeroCelular: req.numeroCelular,
      vigencia: req.vigencia,
      idempotencyKey: req.idempotencyKey
    }).finish();
    return this.executeFinancialView("CreateTelefonico", wire, opts);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.client.close();
  }
  async executeRead(method, reqBytes, deserialize, opts) {
    let attempt = 0;
    for (; ; ) {
      try {
        return await this.unary(method, reqBytes, deserialize, opts);
      } catch (e) {
        const te2 = StatusMapper.map(e);
        if (this.readRetryPolicy.shouldRetry(attempt, te2)) {
          const delay = this.readRetryPolicy.delayMillis(attempt);
          await sleep(delay);
          attempt++;
          continue;
        }
        throw te2;
      }
    }
  }
  async executeReadView(method, reqBytes, opts) {
    const raw = await this.executeRead(method, reqBytes, (b) => JsonResponse.decode(b), opts);
    return new JsonResponseView(raw);
  }
  async executeFinancial(method, reqBytes, deserialize, opts) {
    try {
      return await this.unary(method, reqBytes, deserialize, opts);
    } catch (e) {
      const te2 = StatusMapper.map(e);
      if (te2.isRetryable()) {
        throw new TupagoUnknownOutcomeException(te2.code, te2.description, te2);
      }
      throw te2;
    }
  }
  async executeFinancialView(method, reqBytes, opts) {
    const raw = await this.executeFinancial(method, reqBytes, (b) => JsonResponse.decode(b), opts);
    return new JsonResponseView(raw);
  }
  unary(method, reqBytes, deserialize, opts) {
    const deadlineMillis = opts?.deadlineMillis && opts.deadlineMillis > 0 ? opts.deadlineMillis : this.deadlineMillis;
    const deadline = new Date(Date.now() + deadlineMillis);
    const signal = opts?.signal;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        fn();
      };
      const metadata = new grpc6.Metadata();
      const token = this.credentialProvider.token();
      if (token == null || token.trim() === "") {
        reject(
          new TupagoUnauthenticatedException(
            grpc6.status.UNAUTHENTICATED,
            "No bearer token supplied by CredentialProvider"
          )
        );
        return;
      }
      metadata.set(AUTHORIZATION, `Bearer ${token}`);
      const onAbort = () => call.cancel();
      const call = this.client.makeUnaryRequest(
        `/${SERVICE_NAME}/${method}`,
        (u) => Buffer.from(u),
        (b) => deserialize(new Uint8Array(b)),
        reqBytes,
        metadata,
        { deadline },
        (err, value) => {
          if (signal) signal.removeEventListener("abort", onAbort);
          if (err) {
            finish(() => reject(err));
            return;
          }
          finish(() => resolve(value));
        }
      );
      if (signal) {
        if (signal.aborted) {
          call.cancel();
          finish(
            () => reject(
              new TupagoException({
                code: grpc6.status.CANCELLED,
                description: "Call aborted by AbortSignal",
                message: "CANCELLED: Call aborted by AbortSignal",
                retryable: false,
                pendingReconciliation: false
              })
            )
          );
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
};

// src/client/TupagoPaymentClient.ts
var TupagoPaymentClient = class {
  transport;
  constructor(opts) {
    if (!opts.target) throw new Error("target is required");
    if (!opts.credentials) throw new Error("credentials is required");
    this.transport = opts.transport ?? new GrpcPaymentTransport({
      target: opts.target,
      credentials: opts.credentials,
      tls: opts.tls,
      deadlineMillis: opts.deadlineMillis,
      readRetryPolicy: opts.readRetryPolicy
    });
  }
  /** Profile + institution catalog. */
  getCliente(id, opts) {
    return this.transport.getCliente(id, opts);
  }
  /** Institution catalog by clave_institucion. */
  getCatalogo(claveInstitucion, opts) {
    return this.transport.getCatalogo(claveInstitucion, opts);
  }
  /** Banxico status (JSON) for a QR. */
  getQrStatus(idc, idCuenta, opts) {
    return this.transport.getQrStatus(idc, idCuenta, opts);
  }
  /** Banxico status (JSON) for a telefónico. */
  getTelefonicoStatus(idc, idCuenta, opts) {
    return this.transport.getTelefonicoStatus(idc, idCuenta, opts);
  }
  /**
   * Creates a QR payment. NEVER auto-retried (gate G4). Idempotency: pass a stable
   * idempotencyKey; the server dedupes identical keys. A transient transport error is
   * reclassified as TupagoUnknownOutcomeException (non-retryable) — do NOT blind-resubmit;
   * reuse the same key or call getQrStatus (correction #3).
   */
  createQr(req, opts) {
    return this.transport.createQr(req, opts);
  }
  /**
   * Creates a telefonic payment. NEVER auto-retried (gate G4). Same idempotency/unknown-outcome
   * policy as createQr.
   */
  createTelefonico(req, opts) {
    return this.transport.createTelefonico(req, opts);
  }
  /** Shut down the underlying transport (gate G10). Idempotent. */
  close() {
    this.transport.close();
  }
};

// src/transport/rest.ts
var grpc9 = __toESM(require("@grpc/grpc-js"), 1);

// src/transport/types.ts
function jsonResponseViewFromValue(value) {
  const raw = { json: JSON.stringify(value === void 0 ? null : value) };
  return new JsonResponseView(raw);
}

// src/transport/httpCommon.ts
var grpc7 = __toESM(require("@grpc/grpc-js"), 1);
var NetworkError = class extends Error {
  cause;
  constructor(message, cause) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
};
function bearerHeader(credentials3) {
  const token = credentials3.token();
  if (token == null || token.trim() === "") {
    throw new TupagoUnauthenticatedException(
      grpc7.status.UNAUTHENTICATED,
      "No bearer token supplied by CredentialProvider"
    );
  }
  return { Authorization: `Bearer ${token}` };
}
function resolveSignal(opts, deadlineMillis) {
  const deadline = opts?.deadlineMillis && opts.deadlineMillis > 0 ? opts.deadlineMillis : deadlineMillis;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Deadline exceeded", "TimeoutError")), deadline);
  const onCallerAbort = () => controller.abort();
  if (opts?.signal) {
    if (opts.signal.aborted) controller.abort(opts.signal.reason);
    else opts.signal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const release = () => {
    clearTimeout(timer);
    if (opts?.signal) opts.signal.removeEventListener("abort", onCallerAbort);
  };
  return { signal: controller.signal, release };
}
async function rawFetch(url, init, opts, deadlineMillis) {
  const { signal, release } = resolveSignal(opts, deadlineMillis);
  try {
    const res = await fetch(url, { ...init, signal });
    const text = await res.text();
    return { status: res.status, statusText: res.statusText, headers: res.headers, text };
  } catch (e) {
    release();
    if (e instanceof NetworkError) throw e;
    throw new NetworkError(`transport failure: ${e.message}`, e);
  } finally {
    release();
  }
}
function mapHttpStatusError(status11, text) {
  let problem = void 0;
  try {
    if (text) problem = JSON.parse(text);
  } catch {
  }
  const detail = problem && (problem.detail || problem.message || problem.title) || text || `HTTP ${status11}`;
  switch (status11) {
    case 401:
      return new TupagoUnauthenticatedException(grpc7.status.UNAUTHENTICATED, detail);
    case 403:
      return new TupagoPermissionDeniedException(grpc7.status.PERMISSION_DENIED, detail);
    case 404:
      return new TupagoNotFoundException(grpc7.status.NOT_FOUND, detail);
    case 400:
      return new TupagoInvalidArgumentException(grpc7.status.INVALID_ARGUMENT, detail, problem);
    case 409: {
      const type = problem && (problem.type || problem.title) || "";
      if (type.includes("IDEMPOTENCY") || type.includes("idempotency")) {
        return new TupagoAlreadyExistsException(grpc7.status.ALREADY_EXISTS, detail);
      }
      if (type.includes("POLICY") || type.includes("policy")) {
        return new TupagoFailedPreconditionException(grpc7.status.FAILED_PRECONDITION, detail);
      }
      return new TupagoAlreadyExistsException(grpc7.status.ALREADY_EXISTS, detail);
    }
    case 202:
      return new TupagoAbortedException(
        grpc7.status.ABORTED,
        `${PENDING_RECONCILIATION_CODE}: ${detail}`
      );
    default:
      if (status11 >= 500) {
        return new TupagoInternalException(grpc7.status.INTERNAL, detail);
      }
      return new TupagoException({
        code: grpc7.status.UNKNOWN,
        description: detail,
        message: `UNKNOWN: HTTP ${status11}: ${detail}`,
        retryable: false,
        pendingReconciliation: false,
        cause: problem
      });
  }
}
function networkToException(err, isCreate) {
  if (isCreate) {
    return new TupagoUnknownOutcomeException(
      grpc7.status.UNKNOWN,
      `ambiguous transport result: ${err?.message ?? err} \u2014 do not blind-resubmit; reuse the same idempotency_key or query status`,
      err
    );
  }
  return new TupagoTransientException(grpc7.status.UNAVAILABLE, `transient transport failure: ${err?.message ?? err}`, err);
}
function parseJsonOrFail(text, ctx) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new TupagoInvalidArgumentException(
      grpc7.status.INVALID_ARGUMENT,
      `malformed JSON success body in ${ctx}: ${e.message}`
    );
  }
}
function requireValue(value, ctx) {
  if (value === null || value === void 0) {
    throw new TupagoInvalidArgumentException(
      grpc7.status.INVALID_ARGUMENT,
      `unexpected empty success payload in ${ctx}`
    );
  }
}

// src/transport/validate.ts
var grpc8 = __toESM(require("@grpc/grpc-js"), 1);
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}
function isNonZeroId(v) {
  if (typeof v === "bigint") return v !== 0n;
  if (typeof v === "number") return Number.isInteger(v) && v !== 0;
  return false;
}
function requireNonDefaultCliente(c, ctx) {
  if (!c || typeof c !== "object") {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: cliente missing`);
  }
  const cliente = c;
  if (!isNonZeroId(cliente.id)) {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: cliente.id missing or defaulted to 0`);
  }
  if (!isNonEmptyString(cliente.nombre)) {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: cliente.nombre missing`);
  }
  if (!isNonEmptyString(cliente.claveInstitucion)) {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: cliente.claveInstitucion missing`);
  }
}
function requireNonDefaultCatalogo(c, ctx) {
  if (!c || typeof c !== "object") {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: catalogoInstitucion missing`);
  }
  const cat = c;
  if (!isNonZeroId(cat.id)) {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: catalogoInstitucion.id missing or defaulted to 0`);
  }
  if (!isNonEmptyString(cat.claveInstitucion)) {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: catalogoInstitucion.claveInstitucion missing`);
  }
  if (!isNonEmptyString(cat.nombreCorto)) {
    throw new TupagoInvalidArgumentException(grpc8.status.INVALID_ARGUMENT, `${ctx}: catalogoInstitucion.nombreCorto missing`);
  }
}

// src/transport/rest.ts
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function validateAmount2(field, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number (wire type is double); got ${value}`);
  }
}
function createRestTransport(deps) {
  return new RestPaymentTransport(deps);
}
var RestPaymentTransport = class {
  base;
  credentials;
  deadlineMillis;
  readRetryPolicy;
  constructor(deps) {
    if (!deps.target) throw new Error("target (REST base URL) is required");
    if (!deps.credentials) throw new Error("credentials is required");
    this.base = deps.target.replace(/\/+$/, "");
    this.credentials = deps.credentials;
    this.deadlineMillis = deps.deadlineMillis && deps.deadlineMillis > 0 ? deps.deadlineMillis : 1e4;
    this.readRetryPolicy = deps.readRetryPolicy ?? BackoffRetryPolicy.of(3);
  }
  async getCliente(id, opts) {
    const idStr = String(id);
    return this.dispatchRead("GetCliente", opts, async () => {
      const raw = await this.getJson(`/api/clientesadd/${encodeURIComponent(idStr)}`);
      requireValue(raw, "getCliente");
      const cliente = raw.cliente ?? raw;
      requireNonDefaultCliente(cliente, "getCliente");
      const catalogo = raw.catalogoInstitucion ?? {};
      if (catalogo && typeof catalogo === "object" && Object.keys(catalogo).length > 0) {
        requireNonDefaultCatalogo(catalogo, "getCliente.catalogo");
      }
      return ClientePerfil.fromJSON({ cliente, catalogoInstitucion: catalogo });
    });
  }
  async getCatalogo(claveInstitucion, opts) {
    const clave = claveInstitucion ?? "";
    return this.dispatchRead("GetCatalogo", opts, async () => {
      const raw = await this.getJson(`/api/catalogo-institucions/clave/${encodeURIComponent(clave)}`);
      requireValue(raw, "getCatalogo");
      requireNonDefaultCatalogo(raw, "getCatalogo");
      return CatalogoInstitucion.fromJSON(raw);
    });
  }
  async getQrStatus(idc, idCuenta, opts) {
    return this.dispatchRead("GetQrStatus", opts, async () => {
      const raw = await this.postJson("/api/payments/estatusmsjqr", { idc: idc ?? "" });
      const value = parseJsonOrFail(typeof raw === "string" ? raw : JSON.stringify(raw), "getQrStatus");
      requireValue(value, "getQrStatus");
      return jsonResponseViewFromValue(value);
    });
  }
  async getTelefonicoStatus(idc, idCuenta, opts) {
    return this.dispatchRead("GetTelefonicoStatus", opts, async () => {
      const raw = await this.postJson("/api/payments/estatusmsjcobrotelefonico", {
        idMsjdeCobro: idc ?? ""
      });
      const value = parseJsonOrFail(typeof raw === "string" ? raw : JSON.stringify(raw), "getTelefonicoStatus");
      requireValue(value, "getTelefonicoStatus");
      return jsonResponseViewFromValue(value);
    });
  }
  async createQr(req, opts) {
    validateAmount2("monto", req.monto);
    const body = {
      idCuenta: req.idCuenta.toString(),
      monto: req.monto,
      concepto: req.concepto,
      referenciaNumerica: req.referenciaNumerica,
      nombreCliente: req.nombreCliente,
      email: req.email,
      tipoPago: req.tipoPago,
      vigencia: req.vigencia
    };
    return this.dispatchCreate("CreateQr", opts, req.idempotencyKey, body, (payload) => {
      const qr = payload && typeof payload === "object" && "mensaje" in payload ? payload.mensaje : payload;
      requireValue(qr, "createQr.mensaje");
      return jsonResponseViewFromValue(qr);
    });
  }
  async createTelefonico(req, opts) {
    validateAmount2("monto", req.monto);
    const body = {
      key: req.key,
      monto: req.monto,
      concepto: req.concepto,
      referenciaNumerica: req.referenciaNumerica,
      numeroCelular: req.numeroCelular,
      vigencia: req.vigencia
    };
    return this.dispatchCreate("CreateTelefonico", opts, req.idempotencyKey, body, (payload) => {
      requireValue(payload, "createTelefonico");
      return jsonResponseViewFromValue(payload);
    });
  }
  close() {
  }
  async getJson(path) {
    const res = await rawFetch(
      `${this.base}${path}`,
      { method: "GET", headers: this.headers() },
      void 0,
      this.deadlineMillis
    );
    if (res.status >= 400) throw mapHttpStatusError(res.status, res.text);
    return parseJsonOrFail(res.text, path);
  }
  async postJson(path, body, idempotencyKey) {
    const headers = this.headers();
    headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await rawFetch(
      `${this.base}${path}`,
      { method: "POST", headers, body: JSON.stringify(body) },
      void 0,
      this.deadlineMillis
    );
    if (res.status >= 400) throw mapHttpStatusError(res.status, res.text);
    return parseJsonOrFail(res.text, path);
  }
  headers() {
    return bearerHeader(this.credentials);
  }
  async dispatchRead(_method, opts, op) {
    let attempt = 0;
    for (; ; ) {
      try {
        return await op();
      } catch (e) {
        const te2 = this.toReadError(e);
        if (this.readRetryPolicy.shouldRetry(attempt, te2)) {
          await sleep2(this.readRetryPolicy.delayMillis(attempt));
          attempt++;
          continue;
        }
        throw te2;
      }
    }
  }
  async dispatchCreate(_method, opts, idempotencyKey, body, adapt) {
    const path = _method === "CreateQr" ? "/api/payments/msjpagoqrusuario" : "/api/payments/msjpagotelefonicousuario";
    try {
      const headers = this.headers();
      headers["Content-Type"] = "application/json";
      headers["Idempotency-Key"] = idempotencyKey;
      const res = await rawFetch(
        `${this.base}${path}`,
        { method: "POST", headers, body: JSON.stringify(body) },
        opts,
        this.deadlineMillis
      );
      if (res.status === 202) throw mapHttpStatusError(202, res.text);
      if (res.status >= 400) throw mapHttpStatusError(res.status, res.text);
      const payload = parseJsonOrFail(res.text, path);
      return adapt(payload);
    } catch (e) {
      if (e instanceof NetworkError) throw networkToException(e, true);
      if (e instanceof TupagoException) throw e;
      throw new TupagoUnknownOutcomeException(grpc9.status.UNKNOWN, `ambiguous create outcome: ${e.message}`, e);
    }
  }
  toReadError(e) {
    if (e instanceof TupagoException) return e;
    if (e instanceof NetworkError) return networkToException(e, false);
    return new TupagoException({
      code: grpc9.status.UNKNOWN,
      description: e?.message ?? String(e),
      message: `UNKNOWN: ${e?.message ?? e}`,
      retryable: false,
      pendingReconciliation: false,
      cause: e
    });
  }
};

// src/transport/graphql.ts
var grpc10 = __toESM(require("@grpc/grpc-js"), 1);
var GQL_PENDING_CODE = "PAYMENT_PENDING_RECONCILIATION";
var ALIAS = "q";
function sleep3(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function validateAmount3(field, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number (wire type is double); got ${value}`);
  }
}
function createGraphqlTransport(deps) {
  return new GraphqlPaymentTransport(deps);
}
var GraphqlPaymentTransport = class {
  base;
  credentials;
  deadlineMillis;
  readRetryPolicy;
  constructor(deps) {
    if (!deps.target) throw new Error("target (GraphQL base URL) is required");
    if (!deps.credentials) throw new Error("credentials is required");
    this.base = deps.target.replace(/\/+$/, "");
    this.credentials = deps.credentials;
    this.deadlineMillis = deps.deadlineMillis && deps.deadlineMillis > 0 ? deps.deadlineMillis : 1e4;
    this.readRetryPolicy = deps.readRetryPolicy ?? BackoffRetryPolicy.of(3);
  }
  // ---- reads (transient-retryable) ----
  async getCliente(id, opts) {
    const query = `query($id:ID!){ ${ALIAS}: cliente(id:$id){ cliente{ id nombre claveInstitucion key } catalogoInstitucion{ id claveInstitucion nombreCorto } } }`;
    return this.dispatchRead("GetCliente", opts, { query, variables: { id: String(id) } }, (data) => {
      requireValue(data?.cliente, "getCliente.cliente");
      requireValue(data?.catalogoInstitucion, "getCliente.catalogoInstitucion");
      const perfil = ClientePerfil.fromJSON({ cliente: data.cliente, catalogoInstitucion: data.catalogoInstitucion });
      requireNonDefaultCliente(perfil.cliente, "getCliente");
      requireNonDefaultCatalogo(perfil.catalogoInstitucion, "getCliente");
      return perfil;
    });
  }
  async getCatalogo(claveInstitucion, opts) {
    const query = `query($c:String!){ ${ALIAS}: catalogoInstitucion(claveInstitucion:$c){ id claveInstitucion nombreCorto } }`;
    return this.dispatchRead("GetCatalogo", opts, { query, variables: { c: claveInstitucion ?? "" } }, (data) => {
      requireValue(data, "getCatalogo");
      const cat = CatalogoInstitucion.fromJSON(data);
      requireNonDefaultCatalogo(cat, "getCatalogo");
      return cat;
    });
  }
  async getQrStatus(idc, idCuenta, opts) {
    const query = `query($idc:String!,$idCuenta:ID!){ ${ALIAS}: pagoQrEstatusByCuenta(idc:$idc,idCuenta:$idCuenta) }`;
    return this.dispatchRead(
      "GetQrStatus",
      opts,
      { query, variables: { idc: idc ?? "", idCuenta: String(idCuenta) } },
      (data) => jsonResponseViewFromValue(data)
    );
  }
  async getTelefonicoStatus(idc, idCuenta, opts) {
    const query = `query($idc:String!,$idCuenta:ID!){ ${ALIAS}: pagoTelefonicoEstatusByCuenta(idc:$idc,idCuenta:$idCuenta) }`;
    return this.dispatchRead(
      "GetTelefonicoStatus",
      opts,
      { query, variables: { idc: idc ?? "", idCuenta: String(idCuenta) } },
      (data) => jsonResponseViewFromValue(data)
    );
  }
  // ---- creates (NEVER auto-retried) ----
  async createQr(req, opts) {
    validateAmount3("monto", req.monto);
    const query = `mutation($in:PagoQrInput!,$k:String){ ${ALIAS}: createPagoQr(input:$in,idempotencyKey:$k) }`;
    const input = {
      idCuenta: String(req.idCuenta),
      monto: req.monto,
      concepto: req.concepto,
      referenciaNumerica: req.referenciaNumerica,
      nombreCliente: req.nombreCliente,
      email: req.email,
      tipoPago: req.tipoPago,
      vigencia: req.vigencia
    };
    return this.dispatchCreate(
      "CreateQr",
      opts,
      { query, variables: { in: input, k: req.idempotencyKey } },
      (data) => jsonResponseViewFromValue(data)
    );
  }
  async createTelefonico(req, opts) {
    validateAmount3("monto", req.monto);
    const query = `mutation($in:PagoTelefonicoInput!,$k:String){ ${ALIAS}: createPagoTelefonico(input:$in,idempotencyKey:$k) }`;
    const input = {
      key: req.key,
      monto: req.monto,
      concepto: req.concepto,
      referenciaNumerica: req.referenciaNumerica,
      numeroCelular: req.numeroCelular,
      vigencia: req.vigencia
    };
    return this.dispatchCreate(
      "CreateTelefonico",
      opts,
      { query, variables: { in: input, k: req.idempotencyKey } },
      (data) => jsonResponseViewFromValue(data)
    );
  }
  close() {
  }
  // ---- internals ----
  async post(body, opts) {
    const headers = bearerHeader(this.credentials);
    headers["Content-Type"] = "application/json";
    const res = await rawFetch(
      `${this.base}/graphql`,
      { method: "POST", headers, body: JSON.stringify(body) },
      opts,
      this.deadlineMillis
    );
    if (res.status >= 400) throw mapHttpStatusError(res.status, res.text);
    return parseJsonOrFail(res.text, "graphql");
  }
  resultOrThrow(payload, _isCreate) {
    if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
      const pending = payload.errors.find((e) => e?.extensions?.code === GQL_PENDING_CODE);
      if (pending) {
        throw new TupagoAbortedException(
          grpc10.status.ABORTED,
          `${PENDING_RECONCILIATION_CODE}: ${pending.message ?? "payment pending reconciliation"}`
        );
      }
      throw mapGraphQLError(payload.errors);
    }
    if (payload == null || typeof payload !== "object" || !("data" in payload) || payload.data == null) {
      throw new TupagoInvalidArgumentException(grpc10.status.INVALID_ARGUMENT, "GraphQL response missing data envelope");
    }
    return payload.data[ALIAS];
  }
  async dispatchRead(_method, opts, body, adapt) {
    let attempt = 0;
    for (; ; ) {
      try {
        const payload = await this.post(body, opts);
        return adapt(this.resultOrThrow(payload, false));
      } catch (e) {
        const te2 = this.normalizeReadError(e);
        if (this.readRetryPolicy.shouldRetry(attempt, te2)) {
          await sleep3(this.readRetryPolicy.delayMillis(attempt));
          attempt++;
          continue;
        }
        throw te2;
      }
    }
  }
  async dispatchCreate(_method, opts, body, adapt) {
    try {
      const payload = await this.post(body, opts);
      return adapt(this.resultOrThrow(payload, true));
    } catch (e) {
      if (e instanceof NetworkError) throw networkToException(e, true);
      if (e instanceof TupagoException) throw e;
      throw new TupagoUnknownOutcomeException(
        grpc10.status.UNKNOWN,
        `ambiguous create outcome: ${e?.message ?? e}`,
        e
      );
    }
  }
  /**
   * Normalize any read failure into a {@link TupagoException} so the configured readRetryPolicy can
   * make a single, uniform retry decision. A transport/network failure (NetworkError) becomes a
   * retryable TransientException; this is what makes GraphQL reads retry transient failures through
   * BackoffRetryPolicy (mirroring the REST transport's toReadError). Creates do NOT use this path.
   */
  normalizeReadError(e) {
    if (e instanceof NetworkError) return networkToException(e, false);
    if (e instanceof TupagoException) return e;
    return new TupagoInvalidArgumentException(
      grpc10.status.INVALID_ARGUMENT,
      `unexpected read failure: ${e?.message ?? e}`,
      e
    );
  }
};
function mapGraphQLError(errors) {
  const e0 = errors[0] ?? {};
  const code = e0?.extensions?.code ?? e0?.extensions?.classification ?? "";
  const msg = e0?.message ?? "GraphQL error";
  if (code === "UNAUTHENTICATED" || /unauth/i.test(msg)) {
    return new TupagoUnauthenticatedException(grpc10.status.UNAUTHENTICATED, msg);
  }
  if (code === "NOT_FOUND" || /not found/i.test(msg)) {
    return new TupagoNotFoundException(grpc10.status.NOT_FOUND, msg);
  }
  if (code === "INTERNAL" || /internal/i.test(msg)) {
    return new TupagoInternalException(grpc10.status.INTERNAL, msg);
  }
  return new TupagoInvalidArgumentException(grpc10.status.INVALID_ARGUMENT, msg);
}

// src/auth/BearerCallCredentials.ts
var grpc11 = __toESM(require("@grpc/grpc-js"), 1);
var BearerCallCredentials = class _BearerCallCredentials {
  /** Metadata key expected by the backend (ASCII, lowercase). */
  static AUTHORIZATION = "authorization";
  static create(provider) {
    return grpc11.credentials.createFromMetadataGenerator((_params, callback) => {
      const token = provider.token();
      if (token == null || token.trim() === "") {
        const err = new Error("No bearer token supplied by CredentialProvider");
        err.code = grpc11.status.UNAUTHENTICATED;
        callback(err, void 0);
        return;
      }
      const metadata = new grpc11.Metadata();
      metadata.set(_BearerCallCredentials.AUTHORIZATION, `Bearer ${token}`);
      callback(null, metadata);
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BackoffRetryPolicy,
  BearerCallCredentials,
  CatalogoInstitucion,
  ChannelSecurity,
  Cliente,
  ClientePerfil,
  CreateQrRequest,
  CreateTelefonicoRequest,
  GetCatalogoRequest,
  GetClienteRequest,
  GetStatusRequest,
  GraphqlPaymentTransport,
  GrpcPaymentTransport,
  JsonResponse,
  JsonResponseView,
  NoRetryPolicy,
  PENDING_RECONCILIATION_CODE,
  RestPaymentTransport,
  StatusMapper,
  TlsConfig,
  TupagoAbortedException,
  TupagoAlreadyExistsException,
  TupagoException,
  TupagoFailedPreconditionException,
  TupagoInternalException,
  TupagoInvalidArgumentException,
  TupagoNotFoundException,
  TupagoPaymentClient,
  TupagoPermissionDeniedException,
  TupagoTransientException,
  TupagoUnauthenticatedException,
  TupagoUnknownOutcomeException,
  createGraphqlTransport,
  createRestTransport
});
//# sourceMappingURL=index.cjs.map