"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/data/api-client";
import { btn, card, EmptyState, field } from "./ui";

interface PendingLetter {
  id: string;
  date: string;
  kelasId: string;
  keterangan: string;
  fileName: string;
  fileSize: number;
  status: string;
  createdAt: string;
  student: { id: string; nama: string; nis: string };
  kelas: { id: string; nama: string };
  uploadedBy: { id: string; nama: string };
}

type ValidatingId = string | null;

export function ValidasiSuratSakit({ onValidated }: { onValidated?: () => void }) {
  const [letters, setLetters] = useState<PendingLetter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<ValidatingId>(null);
  const [catatan, setCatatan] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchPending = useCallback(async () => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) { setError("Backend belum dikonfigurasi."); setLoading(false); return; }
    try {
      const res = await fetch(new URL("sick-letters/pending", baseUrl), { credentials: "include" });
      if (!res.ok) throw new Error(`Gagal memuat data (${res.status}).`);
      const data = await res.json();
      setLetters(data.items ?? data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat surat menunggu validasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPending(); }, [fetchPending]);

  async function handleValidate(letterId: string, status: "VALID" | "INVALID") {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return;
    setValidatingId(letterId);
    try {
      const body: { status: string; catatan?: string } = { status };
      const note = catatan[letterId]?.trim();
      if (note) body.catatan = note;

      const res = await fetch(new URL(`sick-letters/${letterId}/validate`, baseUrl), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Gagal memvalidasi (${res.status}).`);
      }
      setToast(status === "VALID" ? "Surat divalidasi — presensi siswa diperbarui menjadi Sakit." : "Surat ditolak.");
      setCatatan((prev) => { const next = { ...prev }; delete next[letterId]; return next; });
      await fetchPending();
      onValidated?.();
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : "Gagal memvalidasi surat.");
    } finally {
      setValidatingId(null);
    }
  }

  const baseUrl = getApiBaseUrl();

  if (loading) {
    return (
      <div className={`${card} flex items-center justify-center gap-2 p-8 text-sm text-muted`}>
        <Loader2 size={18} className="animate-spin" /> Memuat surat menunggu validasi…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <EmptyState
        title="Tidak ada surat menunggu validasi"
        description="Semua surat sakit yang dikirim oleh Ketua Kelas sudah divalidasi."
      />
    );
  }

  return (
    <div className="space-y-3">
      {letters.map((letter) => {
        const isProcessing = validatingId === letter.id;
        return (
          <div key={letter.id} className={`${card} p-4 space-y-3`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{letter.student.nama}</p>
                <p className="text-xs text-muted">
                  NIS {letter.student.nis} · {letter.kelas.nama} · {letter.date}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                <Clock size={12} /> Menunggu
              </span>
            </div>

            <p className="text-sm text-ink">{letter.keterangan}</p>

            <div className="flex items-center gap-2 text-xs text-muted">
              <FileText size={14} className="shrink-0" />
              <span>Dikirim oleh {letter.uploadedBy.nama}</span>
              {baseUrl && (
                <a
                  href={new URL(`sick-letters/${letter.id}/file`, baseUrl).toString()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Buka berkas <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input
                value={catatan[letter.id] ?? ""}
                onChange={(e) => setCatatan((prev) => ({ ...prev, [letter.id]: e.target.value }))}
                placeholder="Catatan validator (opsional)"
                maxLength={255}
                disabled={isProcessing}
                className={`${field} flex-1 text-xs`}
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleValidate(letter.id, "INVALID")}
                  className={`${btn.outline} gap-1.5 text-xs text-danger border-danger/30 hover:bg-danger-soft`}
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Tolak
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleValidate(letter.id, "VALID")}
                  className={`${btn.primary} gap-1.5 text-xs`}
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Validasi
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {toast && (
        <div role="status" className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export function usePendingLetterCount() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return;
    try {
      const res = await fetch(new URL("sick-letters/pending", baseUrl), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCount(typeof data.total === "number" ? data.total : (Array.isArray(data) ? data.length : 0));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { count, refresh };
}
