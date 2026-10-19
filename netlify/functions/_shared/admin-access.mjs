import { getAdminSession } from "./admin-session.mjs";
import { getTeacherSession } from "./teacher-session.mjs";

export function getAuthorizedAdminSession(request) {
  const mainSession = getTeacherSession(request);
  if (mainSession?.role === "admin") return mainSession;
  return getAdminSession(request);
}
