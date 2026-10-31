import { NextResponse, type NextRequest } from "next/server";
import { createContentSecurityPolicy } from "./lib/security/content-security-policy";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/presensi",
  "/siswa",
  "/guru",
  "/kelas",
  "/monitoring",
  "/riwayat",
  "/laporan",
  "/log-aktivitas",
  "/pengaturan",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("presensi_session")?.value;

  // Cek akses ke rute terproteksi tanpa cookie sesi
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah memiliki cookie sesi dan mengakses halaman login -> arahkan ke dashboard
  if (pathname === "/login" && sessionCookie) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL belum dikonfigurasi.");
  const apiOrigin = new URL(apiBaseUrl).origin;
  const policy = createContentSecurityPolicy(nonce, apiOrigin);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
