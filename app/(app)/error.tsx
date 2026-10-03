"use client";

import { useEffect } from "react";
import Link from "next/link";
import { btn, card } from "@/components/ui";

export default function ErrorState({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Terjadi kesalahan pada halaman aplikasi.", error);
  }, [error]);
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <section className={`${card} max-w-lg space-y-4 p-6 text-center`}>
        <h1 className="text-xl font-semibold">Halaman belum dapat dibuka</h1>
        <p className="text-sm text-muted">Terjadi kendala saat memuat halaman. Coba muat ulang, atau kembali ke dashboard.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className={btn.primary}>Coba lagi</button>
          <Link href="/dashboard" className={btn.outline}>Kembali ke dashboard</Link>
        </div>
      </section>
    </main>
  );
}
