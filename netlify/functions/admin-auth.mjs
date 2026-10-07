import {
  clearSessionCookie,
  createSessionCookie,
  credentialsAreValid,
  getAdminSession,
  passwordIsConfigured,
  requestOriginIsValid
} from "./_shared/admin-session.mjs";

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
    const session = getAdminSession(request);
    return jsonResponse({ authenticated: Boolean(session), username: session?.username || null }, session ? 200 : 401);
  }

  if (request.method === "POST") {
    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);
    if (!passwordIsConfigured()) return jsonResponse({ error: "Admin lozinka nije podešena na Netlify-u." }, 503);
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Neispravan zahtev." }, 400);
    }
    if (!credentialsAreValid(body.username, body.password)) {
      return jsonResponse({ error: "Pogrešno korisničko ime ili lozinka." }, 401);
    }
    const username = String(body.username).trim().toLowerCase();
    return jsonResponse({ authenticated: true, username }, 200, { "Set-Cookie": createSessionCookie(username, request) });
  }

  if (request.method === "DELETE") {
    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);
    return jsonResponse({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie(request) });
  }

  return jsonResponse({ error: "Metoda nije dozvoljena." }, 405, { Allow: "GET, POST, DELETE" });
};
