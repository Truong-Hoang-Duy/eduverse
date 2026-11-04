export default function TeacherLoading() {
  return (
    <div
      className="space-y-6 animate-in fade-in duration-150"
      aria-busy="true"
      aria-label="Đang tải trang"
    >
      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-lg bg-muted/70" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted/50" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/30" />
        <div className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/30" />
        <div className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/30" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl border border-border/50 bg-muted/25" />
        <div className="h-48 animate-pulse rounded-xl border border-border/50 bg-muted/25" />
      </div>
    </div>
  );
}
