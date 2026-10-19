import { requestOriginIsValid } from "./_shared/admin-session.mjs";
import {
  clearTeacherSessionCookie,
  createTeacherSessionCookie,
  getTeacherSession,
  authenticateUser
} from "./_shared/teacher-session.mjs";

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

export default async (request) => {
  if (request.method === "GET") {
    const session = getTeacherSession(request);
    return jsonResponse({ authenticated: Boolean(session), username: session?.username || null, role: session?.role || null, isAdmin: session?.role === "admin" }, session ? 200 : 401);
  }

  if (request.method === "POST") {
    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Neispravan zahtev." }, 400);
    }
    const user = authenticateUser(body.username, body.password);
    if (!user) {
      return jsonResponse({ error: "Pogrešno korisničko ime ili lozinka." }, 401);
    }
    return jsonResponse(
      { authenticated: true, username: user.username, role: user.role, isAdmin: user.role === "admin", remembered: body.remember === true },
      200,
      { "Set-Cookie": createTeacherSessionCookie(request, user, body.remember === true) }
    );
  }

  if (request.method === "DELETE") {
    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);
    return jsonResponse(
      { authenticated: false },
      200,
      { "Set-Cookie": clearTeacherSessionCookie(request) }
    );
  }

  return jsonResponse({ error: "Metoda nije dozvoljena." }, 405, { Allow: "GET, POST, DELETE" });
};
