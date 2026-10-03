import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Presensi Siswa | SMK Negeri 11 Jakarta",
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "128x128" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
