const VERSION = "v1.0";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Eduverse — Dashboard quản lý lớp học lập trình
        </p>
        <span className="rounded-md border px-2 py-0.5 font-mono">{VERSION}</span>
      </div>
    </footer>
  );
}
