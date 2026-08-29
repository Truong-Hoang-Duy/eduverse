import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { isSafeHttpUrl } from "@/lib/drive-url";

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  image_urls: string[];
  repo_url: string | null;
  drive_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
  authorName: string;
  updatedAt?: string;
}

function LinkChip({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  // repo_url/demo_url là URL học viên dán. Validate ở `saveProject` KHÔNG đủ:
  // RLS cho em ghi thẳng dòng `projects` của mình qua API, nên `javascript:`
  // lọt vào DB được và đây là chỗ nó biến thành link bấm được cho GV/bạn học.
  if (!isSafeHttpUrl(href)) return null;
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
export function ProjectCard({
  project,
  hideHeading = false,
}: {
  project: ProjectView;
  /**
   * Bỏ dòng tên dự án + tên học viên. Dùng khi nơi gọi ĐÃ hiện chúng ở tiêu đề
   * (popup gallery) — để cả hai là lặp y nguyên một thông tin hai lần.
   */
  hideHeading?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        {!hideHeading && (
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{project.name}</h3>
            <span className="text-xs text-muted-foreground">
              · {project.authorName}
              {project.updatedAt &&
                ` · Cập nhật ${new Date(project.updatedAt).toLocaleDateString("vi-VN")}`}
            </span>
          </div>
        )}
        {project.description && (
          <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {project.image_urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.image_urls.map((url, i) => (
            <SafeImage
              key={url}
              src={url}
              alt={`Ảnh ${i + 1} sản phẩm của ${project.authorName}`}
              className="h-24 w-32 rounded-md border bg-muted object-cover"
            />
          ))}
        </div>
      )}

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
          {/* Nguồn KHÔNG phải cột `projects.drive_url` (đã bỏ) mà là link Drive
              học viên tự cài ở "Thư mục nộp bài tập" — nơi lưu đầy đủ bài các
              buổi. RLS chỉ trả link cho chính chủ và GV của lớp, nên bạn cùng
              lớp sẽ không thấy nút này. */}
          <LinkChip href={project.drive_url} label="📁 Thư mục Drive" />
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
