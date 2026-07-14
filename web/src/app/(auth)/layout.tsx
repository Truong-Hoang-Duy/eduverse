import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Nền trang trí: hai mảng màu mờ ở góc */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Eduverse</h1>
          <p className="text-sm text-muted-foreground">
            Lớp học lập trình của bạn
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
