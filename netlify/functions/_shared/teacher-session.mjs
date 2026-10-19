import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "ml_teacher_session";
const SESSION_SECONDS = 8 * 60 * 60;
const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;
const USERS = new Map([
  ["nastavnik", { role: "teacher", passwordHashes: ["85debf5bace9bf38f0d8fafd243d5ac91f375bbe43bd8a80710fbbc5aca8529c"] }],
  ["direktor", { role: "admin", passwordHashes: ["316b2a34a99ff042202aa422ff8d6bcc9321f4495871e5660df8deb5b4935e60", "3ced2186ae1ccaafd62acea9a7bce07cbc297e2bc778f5451ad724f1acf9f40c"] }],
  ["koordinator", { role: "admin", passwordHashes: ["316b2a34a99ff042202aa422ff8d6bcc9321f4495871e5660df8deb5b4935e60", "3ced2186ae1ccaafd62acea9a7bce07cbc297e2bc778f5451ad724f1acf9f40c"] }]
]);

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionSecret() {
  const passwordHashes = [...USERS.values()].flatMap((user) => user.passwordHashes).join(":");
  return process.env.TEACHER_SESSION_SECRET || `mejkers-lab:${passwordHashes}`;
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

export function authenticateUser(username, password) {
  const normalizedUser = String(username || "").trim().toLowerCase();
  const user = USERS.get(normalizedUser);
  if (!user) return null;
  const passwordHash = createHash("sha256").update(String(password || "").trim()).digest("hex");
  if (!user.passwordHashes.some((expectedHash) => safeEqual(passwordHash, expectedHash))) return null;
  return { username: normalizedUser, role: user.role };
}

export function teacherCredentialsAreValid(username, password) {
  return Boolean(authenticateUser(username, password));
}

export function createTeacherSessionCookie(request, userOrRemember = { username: "nastavnik", role: "teacher" }, rememberArgument = false) {
  const user = typeof userOrRemember === "boolean" ? { username: "nastavnik", role: "teacher" } : userOrRemember;
  const remember = typeof userOrRemember === "boolean" ? userOrRemember : rememberArgument;
  const duration = remember ? REMEMBERED_SESSION_SECONDS : SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + duration * 1000
  })).toString("base64url");
  const token = `${payload}.${signature(payload)}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const persistence = remember ? `; Max-Age=${duration}` : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict${persistence}`;
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
    const user = USERS.get(session.username);
    if (!user || user.role !== session.role || Number(session.expiresAt) <= Date.now()) return null;
    return { username: session.username, role: session.role, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}
