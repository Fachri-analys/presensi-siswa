"use client";

import { useEffect } from "react";
import Link from "next/link";
import { btn, card } from "@/components/ui";

export default function NotFound() {
  useEffect(() => {
    console.error("Alamat halaman tidak ditemukan.", { path: window.location.pathname });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className={`${card} max-w-lg space-y-4 p-6 text-center`}>
        <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-sm text-muted">Alamat yang dibuka tidak tersedia. Kembali ke halaman yang benar untuk melanjutkan.</p>
        <Link href="/login" className={btn.primary}>Ke halaman masuk</Link>
      </section>
    </main>
  );
}
