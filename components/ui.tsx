import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_LABEL, type Status, type Tone } from "@/lib/types";

const BASE_BTN = "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-50 pointer-coarse:h-12";
export const btn = {
  primary: `${BASE_BTN} bg-primary text-white hover:bg-primary/90`,
  accent: `${BASE_BTN} bg-accent text-white hover:bg-accent/90`,
  outline: `${BASE_BTN} border border-line bg-surface text-ink hover:bg-canvas`,
  danger: `${BASE_BTN} bg-danger text-white hover:bg-danger/90`,
};
export const field = "h-10 rounded-md border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted pointer-coarse:h-12";
export const card = "rounded-md border border-line bg-surface";

const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent-ink",
  neutral: "bg-primary-soft text-muted",
};
const STATUS_TONE: Record<Status, Tone> = { HADIR: "success", TERLAMBAT: "accent", IZIN: "info", SAKIT: "warning", ALPA: "danger" };

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: Status | null }) {
  return status ? <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge> : <Badge tone="neutral">Belum presensi</Badge>;
}

const VALUE_COLOR = { ink: "text-ink", success: "text-success", info: "text-info", warning: "text-warning", danger: "text-danger", muted: "text-muted" } as const;

export function StatCard({ label, value, color = "ink", highlight }: { label: string; value: number; color?: keyof typeof VALUE_COLOR; highlight?: boolean }) {
  return (
    <div className={`${card} p-4 ${highlight ? "border-warning bg-warning-soft" : ""}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-2 text-[2rem] font-semibold leading-10 ${VALUE_COLOR[color]}`}>{value}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-primary-soft ${className}`} />
);

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  unit: string;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, unit, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const pageBtn = "grid size-8 pointer-coarse:size-10 place-items-center rounded-sm border text-sm font-medium disabled:opacity-40";
  return (
    <nav aria-label="Navigasi halaman" className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
      <span>Menampilkan {from}–{to} dari {total} {unit}</span>
      <div className="flex gap-2">
        <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${pageBtn} border-line`}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={`${pageBtn} ${p === page ? "border-primary bg-primary text-white" : "border-line"}`}
          >
            {p}
          </button>
        ))}
        <button type="button" aria-label="Halaman berikutnya" disabled={page >= pages} onClick={() => onChange(page + 1)} className={`${pageBtn} border-line`}>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
