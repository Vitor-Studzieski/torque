// Keep the original Error briefly for the SSR wrapper, but never send its message,
// stack, request data, or cause chain to the platform log pipeline.
let lastCapturedError;
const TTL_MS = 5_000;
const CAUSE_DEPTH_LIMIT = 5;
const LOG_VALUE_LENGTH_LIMIT = 500;
const SENSITIVE_LOG_KEY =
  /(?:authorization|cookie|email|phone|password|secret|token|access.?key|api.?key|private.?key|credential|connection|string|query|sql|body|payload|url|file.?name|original.?name|document|cnpj|plate|display.?name|actor.?label|actor.?id|user.?id|workshop.?id|customer|address|^name$|^id$)/i;
const SECRET_TEXT_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9_-]+\b/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\bpostgres(?:ql)?:\/\/[^\s"'<>]+/gi,
  /\b(?:x-amz-(?:signature|credential|security-token)|signature|access[_-]?key|secret[_-]?key|api[_-]?key|credential|token|password)=([^&\s]+)/gi,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
];

function record(error) {
  lastCapturedError = { error, at: Date.now() };
}

export function describeError(error) {
  const parts = [];
  let current = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push("NonErrorCause");
      break;
    }
    const label = depth === 0 ? "" : "caused-by:";
    const status = describeStatus(current);
    const code = /^[A-Z0-9_-]{1,64}$/.test(String(current.code ?? ""))
      ? ` code=${current.code}`
      : "";
    const name = /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(String(current.name ?? ""))
      ? current.name
      : "Error";
    parts.push(`${label}${name}${status}${code}`);
    current = current.cause;
  }
  return parts.join(" ").slice(0, LOG_VALUE_LENGTH_LIMIT);
}

function describeStatus(error) {
  const { status, statusCode } = error;
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

function redactText(value) {
  return SECRET_TEXT_PATTERNS.reduce((text, pattern, index) => {
    if (index === 4) return text.replace(pattern, (match) => match.replace(/=.*/, "=[REDACTED]"));
    return text.replace(pattern, "[REDACTED]");
  }, value).slice(0, LOG_VALUE_LENGTH_LIMIT);
}

function redactLogValue(value, key = "", depth = 0, seen = new WeakSet()) {
  if (SENSITIVE_LOG_KEY.test(key)) return "[REDACTED]";
  if (value instanceof Error) {
    record(value);
    return describeError(value);
  }
  if (typeof value === "string") return redactText(value);
  if (value == null || typeof value !== "object") return value;
  if (depth >= 5 || seen.has(value)) return "[OMITTED]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactLogValue(item, "", depth + 1, seen));
  }

  const sanitized = {};
  for (const [childKey, childValue] of Object.entries(value).slice(0, 40)) {
    sanitized[childKey] = redactLogValue(childValue, childKey, depth + 1, seen);
  }
  return sanitized;
}

// Redact application and framework errors before they reach platform logs.
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  originalConsoleError(...args.map((arg) => redactLogValue(arg)));
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record(event.error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) => record(event.reason));
}

export function consumeLastCapturedError() {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
