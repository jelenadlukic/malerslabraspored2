import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "ml_teacher_session";
const SESSION_SECONDS = 8 * 60 * 60;
const USERNAME = "nastavnik";
const PASSWORD_HASH = "85debf5bace9bf38f0d8fafd243d5ac91f375bbe43bd8a80710fbbc5aca8529c";

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionSecret() {
  return process.env.TEACHER_SESSION_SECRET || `mejkers-lab:${PASSWORD_HASH}`;
}

function signature(value) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function readCookie(request) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name !== COOKIE_NAME) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return "";
    }
  }
  return "";
}

export function teacherCredentialsAreValid(username, password) {
  const normalizedUser = String(username || "").trim().toLowerCase();
  const passwordHash = createHash("sha256").update(String(password || "")).digest("hex");
  return normalizedUser === USERNAME && safeEqual(passwordHash, PASSWORD_HASH);
}

export function createTeacherSessionCookie(request) {
  const payload = Buffer.from(JSON.stringify({
    username: USERNAME,
    expiresAt: Date.now() + SESSION_SECONDS * 1000
  })).toString("base64url");
  const token = `${payload}.${signature(payload)}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearTeacherSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
}

export function getTeacherSession(request) {
  const token = readCookie(request);
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const receivedSignature = token.slice(separator + 1);
  if (!safeEqual(receivedSignature, signature(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.username !== USERNAME || Number(session.expiresAt) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
