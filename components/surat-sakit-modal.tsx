"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Dialog } from "./dialog";
import { btn, field } from "./ui";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";
import { getClasses, OWN_CLASS_ID } from "@/lib/mock";
import { getLocalDateKey, saveDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot, subscribeToDemoAttendance } from "@/lib/demo-attendance";
import { addDemoActivity } from "@/lib/activity-log";
import { useRole } from "./app-shell";

interface SuratSakitModalProps {
  open: boolean;
  onClose: () => void;
  initialClassId?: string;
  initialNis?: string;
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SuratSakitModal({
  open,
  onClose,
  initialClassId,
  initialNis,
}: SuratSakitModalProps) {
  const { role } = useRole();
  const isKetuaKelas = role === "KETUA_KELAS";
  const activeClassId = isKetuaKelas ? OWN_CLASS_ID : (initialClassId ?? OWN_CLASS_ID);
  const classes = getClasses();
  const students = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);

  // Filter siswa aktif sesuai kelas
  const availableStudents = students.filter(
    (s) => s.status === "active" && (!activeClassId || s.kelasId === activeClassId)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  // Form states
  const [nis, setNis] = useState<string>(initialNis ?? "");
  const [tanggal, setTanggal] = useState<string>(getLocalDateKey);
  const [keterangan, setKeterangan] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status & error states
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedInfo, setSubmittedInfo] = useState<{
    nama: string;
    nis: string;
    kelasNama: string;
    tanggal: string;
    keterangan: string;
    fileName: string;
    fileSize: string;
  } | null>(null);

  function resetForm() {
    setNis(initialNis ?? "");
    setTanggal(getLocalDateKey());
    setKeterangan("");
    setSelectedFile(null);
    setErrors({});
    setErrorMessage(null);
    setStatus("idle");
    setSubmittedInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      // Periksa ekstensi jika mime type tidak terdeteksi di browser
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "jpg", "jpeg", "png"].includes(ext ?? "")) {
        return "Format file tidak didukung. Harap unggah dokumen PDF atau gambar JPG/PNG.";
      }
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Ukuran file melebihi batas maksimal 5 MB (${formatFileSize(file.size)}).`;
    }
    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileError = validateFile(file);
    if (fileError) {
      setErrors((prev) => ({ ...prev, file: fileError }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
    setSelectedFile(file);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  }

  function handleTriggerFileInput() {
    fileInputRef.current?.click();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validasi field
    if (!nis) {
      newErrors.nis = "Silakan pilih siswa yang mengajukan surat sakit.";
    }
    if (!tanggal) {
      newErrors.tanggal = "Tanggal surat sakit wajib diisi.";
    }
    if (!keterangan.trim()) {
      newErrors.keterangan = "Keterangan sakit wajib diisi.";
    } else if (keterangan.trim().length < 3) {
      newErrors.keterangan = "Keterangan minimal 3 karakter.";
    }
    if (!selectedFile) {
      newErrors.file = "Bukti surat sakit (file PDF / gambar) wajib diunggah.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setErrorMessage(null);
    setStatus("loading");

    try {
      // Simulasi upload berkas ke server
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const targetStudent = students.find((s) => s.nis === nis);
      const studentClass = classes.find((c) => c.id === targetStudent?.kelasId);
      const studentName = targetStudent?.nama ?? nis;
      const studentClassId = targetStudent?.kelasId ?? activeClassId;

      // Update data presensi demo agar status siswa tersimpan sebagai SAKIT
      const currentAttendance = attendanceStore[`${tanggal}::${studentClassId}`] ?? {};
      const updatedAttendance = {
        ...currentAttendance,
        [nis]: {
          status: "SAKIT" as const,
          keterangan: `Surat Sakit: ${keterangan.trim()} (Berkas: ${selectedFile!.name})`,
          waktu: null,
          izinHadir: false,
        },
      };

      const saved = saveDemoAttendance(studentClassId, tanggal, updatedAttendance);
      if (!saved) {
        throw new Error("Penyimpanan presensi lokal gagal.");
      }

      // Catat di audit log
      addDemoActivity(
        "Surat sakit diserahkan",
        `Surat sakit siswa ${studentName} (${nis}) untuk tanggal ${tanggal} berhasil diunggah (${selectedFile!.name}).`
      );

      setSubmittedInfo({
        nama: studentName,
        nis,
        kelasNama: studentClass?.nama ?? "Kelas",
        tanggal,
        keterangan: keterangan.trim(),
        fileName: selectedFile!.name,
        fileSize: formatFileSize(selectedFile!.size),
      });

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Gagal mengunggah surat sakit. Terjadi gangguan pada koneksi data. Silakan coba lagi.");
    }
  }

  const isPDF = selectedFile?.type === "application/pdf" || selectedFile?.name.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} title={status === "success" ? "Surat Sakit Terkirim" : "Submit Surat Sakit"} onClose={handleClose} maxWidthClass="max-w-lg">
      {status === "success" && submittedInfo ? (
        <div className="mt-4 space-y-5">
          <div className="flex flex-col items-center gap-2 text-center py-2">
            <div className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-semibold text-ink">Surat Sakit Berhasil Dikirim</h3>
            <p className="text-sm text-muted max-w-sm">
              Berkas dan keterangan telah berhasil tercatat. Status presensi siswa pada tanggal terkait telah diperbarui menjadi <strong>Sakit</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-4 text-sm space-y-2.5">
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted text-xs">Siswa</span>
              <span className="font-semibold text-ink text-right">
                {submittedInfo.nama} ({submittedInfo.nis})
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted text-xs">Kelas</span>
              <span className="font-medium text-ink">{submittedInfo.kelasNama}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted text-xs">Tanggal Sakit</span>
              <span className="font-medium text-ink">{submittedInfo.tanggal}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted text-xs">Keterangan</span>
              <span className="font-medium text-ink text-right max-w-xs">{submittedInfo.keterangan}</span>
            </div>
            <div className="flex justify-between items-center gap-2 pt-1 border-t border-line">
              <span className="text-muted text-xs">Berkas Terlampir</span>
              <span className="font-medium text-primary text-xs flex items-center gap-1">
                <FileCheck size={14} />
                {submittedInfo.fileName} ({submittedInfo.fileSize})
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm} className={btn.outline}>
              Submit Surat Lain
            </button>
            <button type="button" onClick={handleClose} className={btn.primary}>
              Selesai
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {/* Error Banner */}
          {status === "error" && errorMessage && (
            <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger border border-danger/20">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setErrorMessage(null);
                  }}
                  className="mt-1 text-xs font-semibold underline hover:text-danger/80"
                >
                  Tutup pesan ini dan periksa kembali
                </button>
              </div>
            </div>
          )}

          {/* Pilih Siswa */}
          <label className="grid gap-1.5 text-sm font-medium">
            <span>
              Nama Siswa <span className="text-danger">*</span>
            </span>
            <select
              value={nis}
              onChange={(e) => {
                setNis(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.nis;
                  return next;
                });
              }}
              disabled={status === "loading"}
              className={`${field} ${errors.nis ? "border-danger" : ""}`}
            >
              <option value="" disabled>
                Pilih siswa yang mengajukan surat sakit
              </option>
              {availableStudents.map((s) => (
                <option key={s.nis} value={s.nis}>
                  {s.nama} ({s.nis})
                </option>
              ))}
            </select>
            {errors.nis && <p role="alert" className="text-xs text-danger">{errors.nis}</p>}
          </label>

          {/* Tanggal Sakit */}
          <label className="grid gap-1.5 text-sm font-medium">
            <span>
              Tanggal Sakit <span className="text-danger">*</span>
            </span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => {
                setTanggal(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.tanggal;
                  return next;
                });
              }}
              disabled={status === "loading"}
              className={`${field} ${errors.tanggal ? "border-danger" : ""}`}
            />
            {errors.tanggal && <p role="alert" className="text-xs text-danger">{errors.tanggal}</p>}
          </label>

          {/* Keterangan */}
          <label className="grid gap-1.5 text-sm font-medium">
            <span>
              Keterangan Sakit <span className="text-danger">*</span>
            </span>
            <textarea
              rows={2}
              value={keterangan}
              maxLength={200}
              placeholder="Contoh: Demam tinggi 2 hari, istirahat atas petunjuk dokter Puskesmas."
              onChange={(e) => {
                setKeterangan(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.keterangan;
                  return next;
                });
              }}
              disabled={status === "loading"}
              className={`rounded-md border bg-surface p-3 text-sm text-ink placeholder:text-muted focus:outline-none ${
                errors.keterangan ? "border-danger" : "border-line"
              }`}
            />
            <div className="flex justify-between text-xs text-muted">
              {errors.keterangan ? (
                <p role="alert" className="text-danger">{errors.keterangan}</p>
              ) : (
                <span>Tuliskan gejala atau diagnosa dokter.</span>
              )}
              <span className="tabular-nums">{keterangan.length}/200</span>
            </div>
          </label>

          {/* Upload File Bukti Surat Sakit */}
          <div className="grid gap-1.5 text-sm font-medium">
            <span>
              Unggah Surat Dokter / Bukti Surat Sakit <span className="text-danger">*</span>
            </span>

            {/* Hidden native file input */}
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              disabled={status === "loading"}
              className="sr-only"
            />

            {!selectedFile ? (
              <div
                onClick={handleTriggerFileInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTriggerFileInput();
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label="Klik untuk mengunggah file surat sakit"
                className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  errors.file
                    ? "border-danger bg-danger-soft/40 hover:bg-danger-soft/60"
                    : "border-line bg-canvas hover:border-primary/50 hover:bg-primary-soft/30"
                }`}
              >
                <div className="grid size-10 place-items-center rounded-full bg-surface text-primary shadow-xs transition-transform group-hover:scale-105">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink group-hover:text-primary">
                    Pilih Berkas atau Seret ke Sini
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Format: PDF, JPG, atau PNG (Maksimal 5 MB)
                  </p>
                </div>
              </div>
            ) : (
              /* Tampilan File Terpilih: Nama File, Ukuran, Tombol Ganti, Hapus */
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                    {isPDF ? <FileText size={22} /> : <FileImage size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      {formatFileSize(selectedFile.size)} · {isPDF ? "Dokumen PDF" : "Gambar"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    disabled={status === "loading"}
                    title="Ganti berkas ini"
                    className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink hover:bg-canvas disabled:opacity-50"
                  >
                    <RefreshCw size={13} aria-hidden /> Ganti
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={status === "loading"}
                    title="Hapus berkas ini"
                    aria-label="Hapus file"
                    className="grid size-8 place-items-center rounded-md text-danger hover:bg-danger-soft disabled:opacity-50"
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {errors.file && <p role="alert" className="text-xs text-danger">{errors.file}</p>}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={handleClose}
              disabled={status === "loading"}
              className={`${btn.outline} w-full sm:w-auto`}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={status === "loading"}
              className={`${btn.primary} w-full sm:w-auto min-w-36`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Mengunggah...
                </>
              ) : (
                "Kirim Surat Sakit"
              )}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
