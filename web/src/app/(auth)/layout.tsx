import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-6">
      {/* Nền trang trí: hai mảng màu mờ ở góc */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
            E
          </div>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight">Eduverse</p>
            <p className="text-xs text-muted-foreground">
              Lớp học lập trình của bạn
            </p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
