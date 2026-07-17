import { Badge } from "@/components/ui/badge";

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  repo_url: string | null;
  drive_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
  authorName: string;
  status?: "draft" | "submitted";
  updatedAt?: string;
}

/** Nhãn trạng thái nộp — xanh khi đã nộp, xám khi đang làm. */
export function StatusBadge({ status }: { status?: "draft" | "submitted" }) {
  if (!status) return null;
  return status === "submitted" ? (
    <span className="rounded-md border border-green-600/30 bg-green-600/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
      ✅ Đã nộp
    </span>
  ) : (
    <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
      📝 Đang làm
    </span>
  );
}

function LinkChip({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
    >
      {label} ↗
    </a>
  );
}

/** Hiển thị chi tiết một sản phẩm cuối khóa (read-only). */
export function ProjectCard({ project }: { project: ProjectView }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{project.name}</h3>
          <StatusBadge status={project.status} />
          <span className="text-xs text-muted-foreground">
            · {project.authorName}
            {project.updatedAt &&
              ` · Cập nhật ${new Date(project.updatedAt).toLocaleDateString("vi-VN")}`}
          </span>
        </div>
        {project.description && (
          <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {project.features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.features.map((f) => (
            <Badge key={f} variant="secondary" className="rounded-md font-normal">
              {f}
            </Badge>
          ))}
        </div>
      )}

      {(project.repo_url || project.drive_url || project.demo_url) && (
        <div className="flex flex-wrap gap-2">
          <LinkChip href={project.repo_url} label="GitHub" />
          <LinkChip href={project.drive_url} label="Google Drive" />
          <LinkChip href={project.demo_url} label="Demo" />
        </div>
      )}

      {project.extra_notes && (
        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          📝 {project.extra_notes}
        </p>
      )}
    </div>
  );
}
