"use client";

import { useEffect } from "react";
import Link from "next/link";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Terjadi kesalahan pada aplikasi.", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="grid min-h-screen place-items-center bg-white p-6 font-sans text-slate-900">
        <main className="max-w-lg space-y-4 text-center">
          <h1 className="text-xl font-semibold">Aplikasi sedang mengalami kendala</h1>
          <p className="text-sm text-slate-600">Silakan coba muat ulang halaman atau kembali ke halaman masuk.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className="inline-flex h-10 items-center rounded-md bg-blue-800 px-4 text-sm font-semibold text-white">Coba lagi</button>
            <Link href="/login" className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold">Kembali ke halaman masuk</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
