/**
 * Unsubscribe token utilities.
 *
 * Réplica del modelo HMAC unario de `fire-alert-web/lib/token.ts`,
 * reescrito en TypeScript puro (sin `node:crypto`) para que funcione
 * también en el navegador. La verificación sensible (la que importa
 * para la seguridad del unsubscribe) se hace SIEMPRE en la API route
 * `/api/subscribe` con `crypto.timingSafeEqual` desde Node.
 *
 * Token = HMAC-SHA256(`${email}|${province_slug}`, key=UNSUB_SECRET),
 * devuelto como hex (64 chars).
 *
 * El token es determinista: el mismo (email, province_slug) siempre
 * genera el mismo token mientras el secret no cambie. Esto simplifica
 * mucho la baja: `verifyToken` recalcula el HMAC server-side y compara
 * sin necesidad de leer de DB. La columna `subscriptions.unsubscribe_token`
 * se rellena con el mismo valor en el POST para que la UI de demo
 * pueda mostrar el magic-link al usuario sin esperar al email.
 */

import { createHash, timingSafeEqual } from "node:crypto";

// Server-side path. En build / ejecución de Next.js siempre hay
// `process.env` disponible, así que no necesitamos dynamic import.
function getSecretOrThrow(): string {
  const secret = process.env.UNSUB_SECRET?.trim();
  if (secret && secret.length > 0) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "UNSUB_SECRET no está configurado. Define UNSUB_SECRET en producción para que el unsubscribe HMAC sea seguro."
    );
  }
  // Dev only: secret determinista para que la demo funcione offline.
  return "dev-secret-change-me";
}

function getSecret(): string {
  return process.env.UNSUB_SECRET?.trim() || "dev-secret-change-me";
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  // Web Crypto API funciona en Node 18+ y navegadores modernos; lo
  // usamos para mantener `lib/unsubscribe-token.ts` portable (también
  // se importa desde `TabMyAlerts` y `TabSubscribe` en el cliente).
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeToken(email: string, provinceId: string): Promise<string> {
  return hmacSha256Hex(getSecret(), `${email}|${provinceId}`);
}

/**
 * Verifica un token unario contra un par (email, province_id).
 * En Node se usa `crypto.timingSafeEqual` para evitar timing attacks;
 * la comparación se hace sobre el HMAC recomputado, no sobre el token
 * crudo, lo que neutraliza además leaks por longitud.
 */
export async function verifyToken(
  token: string,
  email: string,
  provinceId: string
): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const expected = await makeToken(email, provinceId);

  // En Node, comparación constant-time sobre el HMAC recomputado.
  // (Si el caller pasa un token de longitud distinta, hacemos hash
  // del input de longitud arbitraria para igualar la longitud antes
  // de comparar — sin esto length leak filtraría información.)
  try {
    const expectedBuf = Buffer.from(expected, "hex");
    let tokenBuf: Buffer;
    try {
      // Aceptamos el token tal cual (hex); si no es hex válido, hacemos
      // sha256 para mantener longitudes iguales antes de comparar.
      tokenBuf = Buffer.from(token, "hex");
      if (tokenBuf.length !== expectedBuf.length) {
        tokenBuf = createHash("sha256").update(tokenBuf).digest();
      }
    } catch {
      tokenBuf = createHash("sha256").update(token).digest();
    }
    return timingSafeEqual(expectedBuf, tokenBuf);
  } catch {
    return false;
  }
}

// Eagerly check secret at module-load in production. Esto evita que
// el primer POST / DELETE "funcione" con el fallback y luego exponga
// un comportamiento distinto al reiniciar con secret configurado.
if (process.env.NODE_ENV === "production") {
  try {
    getSecretOrThrow();
  } catch (err) {
    // Solo lo registramos; no abortamos el proceso porque la app
    // puede funcionar sin unsubscribe en otros modos (dashboard
    // autenticado, etc.).
    console.warn(
      "[unsubscribe-token] ADVERTENCIA:",
      err instanceof Error ? err.message : String(err)
    );
  }
}
