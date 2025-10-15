export function getSessionKey(): string {
  if (typeof window === "undefined") return "server";
  const k = window.localStorage.getItem("mf_session_key");
  if (k) return k;
  const newKey = crypto.randomUUID();
  window.localStorage.setItem("mf_session_key", newKey);
  return newKey;
}
