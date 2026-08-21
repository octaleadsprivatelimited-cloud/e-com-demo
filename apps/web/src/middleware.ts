import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security Middleware
 * -------------------
 * Runs on EVERY request before it reaches a page or API route.
 * Applies defense-in-depth HTTP security headers to all responses.
 */
export function middleware(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = isProduction
    ? btoa(crypto.randomUUID()).replace(/=+$/g, '')
    : '';
  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;

  // ── Core Security Headers ─────────────────────────────────────

  // Prevent clickjacking by disallowing iframing of the app
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME-type sniffing attacks
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Disable the legacy XSS auditor. Modern guidance (and OWASP) is to set this
  // to "0" and rely on Content-Security-Policy instead — the old filter has
  // known bypasses and could itself introduce vulnerabilities.
  response.headers.set("X-XSS-Protection", "0");

  // Control Referer header leakage to external sites
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser features/APIs the page can use
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  // Force HTTPS for 1 year (activate once SSL is configured in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Allow the browser to reach the backend API (cross-origin) and the public
  // pincode lookup used during signup. Derived from env so prod uses its own URL.
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Content Security Policy — tight defaults, allow self + known CDNs
  const scriptPolicy = isProduction
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";
  const csp = [
    "default-src 'self'",
    // TODO PRODUCTION: Replace 'unsafe-eval' 'unsafe-inline' with nonce-based CSP:
    //   script-src 'self' 'nonce-<generated-per-request>'
    // Next.js requires 'unsafe-eval' + 'unsafe-inline' in dev mode only.
    scriptPolicy,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://github.com https://avatars.githubusercontent.com https://images.unsplash.com",
    `connect-src 'self' ${apiOrigin} https://api.postalpincode.in`,
    "frame-src 'self' https://*.youtube.com https://*.youtube-nocookie.com", // Allow YouTube video previews
    "frame-ancestors 'none'",                                       // Same as X-Frame-Options DENY
    "base-uri 'self'",                                              // Prevent <base> tag injection
    "form-action 'self'",                                           // Restrict form submissions to same origin
    "object-src 'none'",                                            // Block Flash/Java embeds
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // ── Rate-limit hint for API routes ────────────────────────────
  // (Real rate-limiting should happen at the reverse proxy / API gateway layer)
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-RateLimit-Policy", "60;w=60");
  }

  // ── Cache control for static assets vs dynamic pages ──────────
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    // Immutable cache for hashed static assets (1 year)
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  } else if (pathname.startsWith("/_next/image")) {
    // Image optimization cache
    response.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  } else {
    // Dynamic pages: no cache, always revalidate
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );
  }

  return response;
}

// Match all routes except Next.js internals and static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
