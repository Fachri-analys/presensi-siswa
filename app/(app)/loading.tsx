import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="stat-grid">
        {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-10" />
      <Skeleton className="h-96" />
    </div>
  );
}
