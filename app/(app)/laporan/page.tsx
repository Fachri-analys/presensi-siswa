"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Logo } from "@/components/logo";
import { btn, card, EmptyState, field } from "@/components/ui";
import { getClasses, getRecap } from "@/lib/mock";
import { currentMonthRange, pct, workDays } from "@/lib/stats";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { useRole } from "@/components/app-shell";
import { OWN_CLASS_ID } from "@/lib/mock";
import { getDemoAttendance, getDemoAttendanceServerSnapshot, getStoredAttendanceRecap, subscribeToDemoAttendance } from "@/lib/demo-attendance";
import { getDemoStudents, getDemoStudentsServerSnapshot, subscribeToDemoStudents } from "@/lib/demo-students";

const classes = getClasses();
const jurusanList = [...new Set(classes.map((c) => c.jurusan))];
const STATUS_KEY: Record<Status, CountKey> = { HADIR: "hadir", TERLAMBAT: "terlambat", IZIN: "izin", SAKIT: "sakit", ALPA: "alpa" };
const TOTAL_KEYS = ["hadir", "izin", "sakit", "alpa", "terlambat"] as const;
type CountKey = (typeof TOTAL_KEYS)[number];
const longDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium">{label}{children}</label>;
}

export default function LaporanPage() {
  const { role } = useRole();
  const [period] = useState(currentMonthRange);
  const [jurusan, setJurusan] = useState("");
  const [kelasId, setKelasId] = useState(classes[0].id);
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [status, setStatus] = useState<Status | "">("");
  const [landscape, setLandscape] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const attendanceStore = useSyncExternalStore(subscribeToDemoAttendance, getDemoAttendance, getDemoAttendanceServerSnapshot);
  const demoStudents = useSyncExternalStore(subscribeToDemoStudents, getDemoStudents, getDemoStudentsServerSnapshot);

  const visibleClasses = role === "KETUA_KELAS" ? classes.filter((c) => c.id === OWN_CLASS_ID) : classes;
  const options = visibleClasses.filter((c) => !jurusan || c.jurusan === jurusan);
  const kelas = options.find((c) => c.id === kelasId) ?? options[0];
  const days = workDays(from, to);
  const storedRecap = getStoredAttendanceRecap(attendanceStore, kelas.id, from, to, demoStudents);
  const reportDays = storedRecap?.days ?? days;
  const rows = (storedRecap?.rows ?? getRecap(kelas.id, days)).filter((r) => !status || r[STATUS_KEY[status]] > 0);
  const total = (key: CountKey) => rows.reduce((sum, r) => sum + r[key], 0);
  const overall = pct(total("hadir"), reportDays * rows.length);
  const daysLabel = storedRecap ? "hari presensi tercatat" : "hari kerja";
  const ready = days > 0 && rows.length > 0;
  const th = "border border-line px-2 py-2 text-center";
  const td = "border border-line px-2 py-2 text-center";

  async function exportExcel() {
    if (!ready || !kelas) return;
    setExporting(true);
    setExportError(false);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Sistem Presensi Siswa - SMK Negeri 11 Jakarta";
      workbook.subject = `Rekap presensi ${kelas.nama}`;
      workbook.title = `Laporan Presensi ${kelas.nama}`;
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Rekap Presensi", {
        views: [{ state: "frozen", ySplit: 11 }],
        pageSetup: { paperSize: 9, orientation: landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        properties: { defaultRowHeight: 22 },
      });
      sheet.columns = [
        { key: "nomor", width: 7 },
        { key: "nis", width: 16 },
        { key: "nama", width: 30 },
        { key: "kelas", width: 16 },
        { key: "hadir", width: 12 },
        { key: "izin", width: 12 },
        { key: "sakit", width: 12 },
        { key: "alpa", width: 12 },
        { key: "terlambat", width: 15 },
        { key: "persentase", width: 15 },
      ];
      sheet.properties.defaultRowHeight = 22;
      sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 11 }];

      const imageResponse = await fetch("/icon.png");
      if (!imageResponse.ok) throw new Error(`Logo sekolah gagal dimuat (${imageResponse.status}).`);
      const logoBytes = new Uint8Array(await imageResponse.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < logoBytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...logoBytes.subarray(offset, Math.min(offset + 0x8000, logoBytes.length)));
      }
      const logoId = workbook.addImage({ base64: `data:image/png;base64,${btoa(binary)}`, extension: "png" });
      sheet.addImage(logoId, "A1:B5");

      sheet.mergeCells("C1:J1");
      sheet.getCell("C1").value = "SMK NEGERI 11 JAKARTA";
      sheet.getCell("C1").font = { name: "Arial", size: 18, bold: true, color: { argb: "FF0F4C8A" } };
      sheet.getCell("C1").alignment = { vertical: "middle" };
      sheet.getRow(1).height = 32;
      sheet.mergeCells("C2:J2");
      sheet.getCell("C2").value = "LAPORAN PRESENSI SISWA";
      sheet.getCell("C2").font = { name: "Arial", size: 13, bold: true };
      sheet.getCell("C2").alignment = { vertical: "middle" };
      sheet.mergeCells("C3:J3");
      sheet.getCell("C3").value = kelas.jurusan;
      sheet.getCell("C3").font = { name: "Arial", size: 11, color: { argb: "FF5B6578" } };
      sheet.getCell("C3").alignment = { vertical: "middle" };
      sheet.mergeCells("C4:J4");
      sheet.getCell("C4").value = kelas.nama;
      sheet.getCell("C4").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F4C8A" } };
      sheet.getCell("C4").alignment = { vertical: "middle" };
      sheet.getRow(5).height = 12;

      sheet.mergeCells("A6:B6");
      sheet.getCell("A6").value = "Periode";
      sheet.mergeCells("C6:F6");
      sheet.getCell("C6").value = `${longDate(from)} - ${longDate(to)}`;
      sheet.mergeCells("G6:H6");
      sheet.getCell("G6").value = storedRecap ? "Hari tercatat" : "Hari kerja";
      sheet.mergeCells("I6:J6");
      sheet.getCell("I6").value = reportDays;
      sheet.mergeCells("A7:B7");
      sheet.getCell("A7").value = "Filter status";
      sheet.mergeCells("C7:J7");
      sheet.getCell("C7").value = status ? STATUS_LABEL[status] : "Semua status";
      for (const rowNumber of [6, 7]) {
        const row = sheet.getRow(rowNumber);
        row.eachCell((cell) => {
          cell.font = { name: "Arial", size: 10, color: { argb: "FF172033" } };
          cell.alignment = { vertical: "middle", wrapText: true };
        });
        row.height = 24;
      }
      for (const address of ["A6", "G6", "A7"]) {
        sheet.getCell(address).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F4C8A" } };
      }

      sheet.mergeCells("A8:J8");
      sheet.getCell("A8").value = "REKAPITULASI KEHADIRAN";
      sheet.getCell("A8").font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getCell("A8").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4C8A" } };
      sheet.getCell("A8").alignment = { vertical: "middle" };
      sheet.getRow(8).height = 25;

      const summary = [
        ["Jumlah siswa", rows.length],
        ["Hadir", total("hadir")],
        ["Izin", total("izin")],
        ["Sakit", total("sakit")],
        ["Alpa", total("alpa")],
        ["Terlambat", total("terlambat")],
        ["Kehadiran", `${overall}%`],
      ];
      summary.forEach(([label, value], index) => {
        const startCol = index + 1;
        const labelCell = sheet.getCell(9, startCol);
        const valueCell = sheet.getCell(10, startCol);
        labelCell.value = label;
        labelCell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF5B6578" } };
        labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        valueCell.value = value;
        valueCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F4C8A" } };
        valueCell.alignment = { horizontal: "center", vertical: "middle" };
        for (const cell of [labelCell, valueCell]) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F0FB" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFDCE5EF" } },
            left: { style: "thin", color: { argb: "FFDCE5EF" } },
            bottom: { style: "thin", color: { argb: "FFDCE5EF" } },
            right: { style: "thin", color: { argb: "FFDCE5EF" } },
          };
        }
      });
      sheet.getRow(9).height = 30;
      sheet.getRow(10).height = 26;

      const headerRowNumber = 11;
      const headerRow = sheet.getRow(headerRowNumber);
      headerRow.values = ["No", "NIS", "Nama Siswa", "Kelas", "Hadir", "Izin", "Sakit", "Alpa", "Terlambat", "Persentase"];
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4C8A" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { bottom: { style: "medium", color: { argb: "FF0F4C8A" } } };
      });

      rows.forEach((row, index) => {
        const excelRow = sheet.addRow([
          index + 1,
          row.nis,
          row.nama,
          kelas.nama,
          row.hadir,
          row.izin,
          row.sakit,
          row.alpa,
          row.terlambat,
          reportDays ? row.hadir / reportDays : 0,
        ]);
        excelRow.height = 22;
        excelRow.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial", size: 10, color: { argb: "FF172033" } };
          cell.alignment = { vertical: "middle", horizontal: colNumber === 3 ? "left" : "center" };
          cell.border = { bottom: { style: "hair", color: { argb: "FFDCE5EF" } } };
          if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7FB" } };
        });
        excelRow.getCell(10).numFmt = "0%";
      });

      const totalRow = sheet.addRow([
        "TOTAL", "", "", "",
        total("hadir"), total("izin"), total("sakit"), total("alpa"), total("terlambat"),
        reportDays && rows.length ? total("hadir") / (reportDays * rows.length) : 0,
      ]);
      totalRow.height = 26;
      totalRow.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F4C8A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F0FB" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "medium", color: { argb: "FF0F4C8A" } } };
      });
      totalRow.getCell(10).numFmt = "0%";
      sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: 10 } };
      sheet.pageSetup.printTitlesRow = "1:11";
      sheet.pageSetup.printArea = `A1:J${totalRow.number}`;
      sheet.headerFooter.oddFooter = "&C Sistem Presensi Siswa - SMK Negeri 11 Jakarta &R Halaman &P dari &N";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Laporan-Presensi-${kelas.nama.replace(/[^a-z0-9]+/gi, "-")}-${from}-${to}.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Gagal mengekspor laporan presensi ke Excel.", error);
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <style>{`@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 14mm 14mm 18mm; }`}</style>

      <section className={`${card} grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 print:hidden`} aria-label="Filter laporan">
        {role !== "KETUA_KELAS" && <>
            <Filter label="Jurusan">
              <select value={jurusan} onChange={(e) => setJurusan(e.target.value)} className={field}>
                <option value="">Semua jurusan</option>
                {jurusanList.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </Filter>
            <Filter label="Kelas">
              <select value={kelas.id} onChange={(e) => setKelasId(e.target.value)} className={field}>
                {options.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
              </select>
            </Filter>
          </>}
        <Filter label="Status presensi">
          <select value={status} onChange={(e) => setStatus(e.target.value as Status | "")} className={field}>
            <option value="">Semua status</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Filter>
        <Filter label="Dari tanggal">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={field} />
        </Filter>
        <Filter label="Sampai tanggal">
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={field} />
        </Filter>
        <Filter label="Orientasi kertas">
          <select value={landscape ? "landscape" : "portrait"} onChange={(e) => setLandscape(e.target.value === "landscape")} className={field}>
            <option value="portrait">A4 Portrait</option>
            <option value="landscape">A4 Landscape</option>
          </select>
        </Filter>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
          <button type="button" disabled={!ready} onClick={() => window.print()} className={btn.primary}>
            <Download size={16} aria-hidden /> Download PDF
          </button>
          <button type="button" disabled={!ready || exporting} onClick={exportExcel} className={btn.outline}>
            <FileSpreadsheet size={16} aria-hidden /> {exporting ? "Menyiapkan Excel…" : "Download Excel"}
          </button>
          <p className="text-xs text-muted">Untuk PDF, pilih “Simpan sebagai PDF” pada dialog cetak yang terbuka.</p>
          {exportError && <p role="alert" className="w-full text-sm text-danger">File Excel belum berhasil dibuat. Coba lagi beberapa saat.</p>}
        </div>
      </section>

      <article
        id="preview-laporan"
        aria-label="Preview laporan"
        className={`mx-auto w-full overflow-x-auto bg-surface p-6 ring-1 ring-line sm:p-8 print:max-w-none print:overflow-visible print:p-0 print:ring-0 ${landscape ? "max-w-[297mm]" : "max-w-[210mm]"}`}
      >
        {!ready ? (
          <EmptyState title="Laporan belum bisa dibuat" description="Pastikan rentang tanggal valid (mencakup hari kerja) dan ada siswa yang sesuai filter." />
        ) : (
          <>
            <header className="flex items-center gap-4 border-b-2 border-primary pb-4">
              <Logo size={56} />
              <div>
                <p className="text-lg font-bold">SMK NEGERI 11 JAKARTA</p>
                <p className="text-sm font-semibold text-muted">LAPORAN PRESENSI SISWA</p>
                <p className="mt-1 text-xs text-muted">{kelas.jurusan}</p>
              </div>
            </header>

            <dl className="my-4 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
              <dt className="text-muted">Jurusan</dt><dd className="font-semibold">: {kelas.jurusan}</dd>
              <dt className="text-muted">Kelas</dt><dd className="font-semibold">: {kelas.nama}</dd>
              <dt className="text-muted">Periode</dt><dd className="font-semibold">: {longDate(from)} – {longDate(to)} ({reportDays} {daysLabel})</dd>
              <dt className="text-muted">Filter</dt><dd className="font-semibold">: {status ? STATUS_LABEL[status] : "Semua status"}</dd>
            </dl>

            <table className="w-full min-w-168 border-collapse text-sm print:min-w-0 print:text-[9pt]">
              <thead className="bg-primary-soft">
                <tr>
                  {["No", "NIS", "Nama Siswa", "Hadir", "Izin", "Sakit", "Alpa", "Terlambat", "Persentase"].map((h) => <th key={h} className={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.nis} className="break-inside-avoid">
                    <td className={td}>{i + 1}</td>
                    <td className={td}>{r.nis}</td>
                    <td className={`${td} text-left`}>{r.nama}</td>
                    <td className={td}>{r.hadir}</td>
                    <td className={td}>{r.izin}</td>
                    <td className={td}>{r.sakit}</td>
                    <td className={td}>{r.alpa}</td>
                    <td className={td}>{r.terlambat}</td>
                    <td className={`${td} font-semibold`}>{pct(r.hadir, reportDays)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="break-inside-avoid bg-primary-soft font-semibold">
                <tr>
                  <td colSpan={3} className={`${td} text-left`}>Rekapitulasi total</td>
                  {TOTAL_KEYS.map((k) => <td key={k} className={td}>{total(k)}</td>)}
                  <td className={td}>{overall}%</td>
                </tr>
              </tfoot>
            </table>

            <p className="mt-4 text-sm">Persentase kehadiran {kelas.nama}: <strong>{overall}%</strong></p>
            <p className="mt-1 text-xs text-muted">Jumlah Hadir mencakup siswa berstatus Terlambat; angka Terlambat ditampilkan terpisah sebagai rincian.</p>
            <p suppressHydrationWarning className="mt-1 text-xs text-muted">
              Laporan dibuat pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <footer className="mt-6 hidden border-t border-line pt-2 text-[10px] text-muted print:fixed print:inset-x-0 print:bottom-0 print:block">
              Dicetak dari Sistem Presensi Siswa SMK Negeri 11 Jakarta
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
