import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "ml_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const ALLOWED_USERS = new Set(["direktor", "koordinator"]);

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getSecret() {
  return process.env.ADMIN_PASSWORD || "";
}

function signature(value, secret) {
  return createHmac("sha256", `mejkers-lab-admin:${secret}`).update(value).digest("base64url");
}

function readCookie(request) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return "";
      }
    }
  }
  return "";
}

export function passwordIsConfigured() {
  return getSecret().length >= 8;
}

export function credentialsAreValid(username, password) {
  const normalizedUser = String(username || "").trim().toLowerCase();
  const configuredPassword = getSecret();
  return ALLOWED_USERS.has(normalizedUser) && configuredPassword.length >= 8 && safeEqual(password, configuredPassword);
}

export function createSessionCookie(username, request) {
  const payload = Buffer.from(JSON.stringify({
    username: String(username).trim().toLowerCase(),
    expiresAt: Date.now() + SESSION_SECONDS * 1000
  })).toString("base64url");
  const token = `${payload}.${signature(payload, getSecret())}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
}

export function getAdminSession(request) {
  const secret = getSecret();
  const token = readCookie(request);
  if (!secret || !token) return null;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const receivedSignature = token.slice(separator + 1);
  if (!safeEqual(receivedSignature, signature(payload, secret))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!ALLOWED_USERS.has(session.username) || Number(session.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function requestOriginIsValid(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
