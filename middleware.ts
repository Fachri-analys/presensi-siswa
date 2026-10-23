import { NextResponse, type NextRequest } from "next/server";

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

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/presensi/:path*",
    "/siswa/:path*",
    "/guru/:path*",
    "/kelas/:path*",
    "/monitoring/:path*",
    "/riwayat/:path*",
    "/laporan/:path*",
    "/log-aktivitas/:path*",
    "/pengaturan/:path*",
    "/login",
  ],
};
