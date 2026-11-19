"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, ExternalLink, FileText, Loader2, XCircle } from "lucide-react";
import { Dialog } from "./dialog";
import { btn, EmptyState } from "./ui";
import { getApiBaseUrl } from "@/lib/data/api-client";

interface SickLetterItem {
  id: string;
  date: string;
  keterangan: string;
  status: "PENDING" | "VALID" | "INVALID";
  catatanValidator: string | null;
  fileName: string;
  createdAt: string;
  student: { nis: string; nama: string };
  verifiedBy?: { nama: string; role: string } | null;
}

interface RiwayatSuratSakitModalProps {
  open: boolean;
  onClose: () => void;
  kelasId: string;
}

export function RiwayatSuratSakitModal({ open, onClose, kelasId }: RiwayatSuratSakitModalProps) {
  const [letters, setLetters] = useState<SickLetterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    if (!kelasId) return;
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      setError("Backend belum dikonfigurasi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(new URL(`sick-letters/class/${encodeURIComponent(kelasId)}`, baseUrl), {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat status surat (${res.status}).`);
      }
      const data = await res.json();
      setLetters(data.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data surat sakit.");
    } finally {
      setLoading(false);
    }
  }, [kelasId]);

  useEffect(() => {
    if (open) {
      void Promise.resolve().then(fetchLetters);
    }
  }, [open, fetchLetters]);

  const baseUrl = getApiBaseUrl();

  return (
    <Dialog open={open} title="Status Surat Sakit Kelas" onClose={onClose} maxWidthClass="max-w-xl">
      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" />
            <span>Memuat riwayat surat sakit…</span>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
            {error}
          </div>
        ) : letters.length === 0 ? (
          <EmptyState
            title="Belum ada surat sakit"
            description="Surat dokter atau bukti keterangan sakit yang diunggah akan tercatat di sini beserta status validasinya."
          />
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {letters.map((letter) => {
              const fileUrl = baseUrl
                ? new URL(`sick-letters/${letter.id}/file`, baseUrl).toString()
                : null;

              return (
                <div key={letter.id} className="rounded-lg border border-line bg-canvas p-3.5 text-sm space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{letter.student.nama}</p>
                      <p className="text-xs text-muted">NIS {letter.student.nis} · Tanggal {letter.date}</p>
                    </div>
                    {letter.status === "VALID" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                        <CheckCircle2 size={12} /> Tervalidasi
                      </span>
                    ) : letter.status === "INVALID" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                        <XCircle size={12} /> Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                        <Clock size={12} /> Menunggu Validasi
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink/90"><span className="text-muted">Keterangan:</span> {letter.keterangan}</p>

                  {letter.catatanValidator && (
                    <div className="rounded bg-surface p-2 text-xs border border-line">
                      <span className="font-medium text-muted">Catatan Validator:</span>{" "}
                      <span className="text-ink">{letter.catatanValidator}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs text-muted border-t border-line/60">
                    <span className="flex items-center gap-1">
                      <FileText size={13} /> {letter.fileName}
                    </span>
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        Buka berkas <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-line">
          <button type="button" onClick={onClose} className={btn.outline}>
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
