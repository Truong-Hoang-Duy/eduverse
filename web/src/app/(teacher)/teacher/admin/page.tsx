import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cleanupOrphanSpecFiles, purgeTestUsers } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/admin-access";
import { buildOpsReport } from "@/lib/admin-report";

import { ConfirmEmailButton } from "./confirm-email-button";
import { OpsActionButton } from "./ops-action-button";

export const metadata = { title: "Vận hành hệ thống — Eduverse" };

// Số liệu vận hành phải tươi mỗi lần vào; cache ở đây là báo sai trạng thái.
export const dynamic = "force-dynamic";

function countOf(
  counts: { table: string; count: number }[],
  table: string
): number {
  return counts.find((c) => c.table === table)?.count ?? 0;
}

export default async function AdminPage() {
  await requireAdmin();
  const report = await buildOpsReport();

  const errorCount = report.issues.filter((i) => i.severity === "error").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vận hành hệ thống"
        description={
          report.issues.length === 0
            ? "Dữ liệu toàn vẹn — không phát hiện vấn đề nào."
            : `${report.issues.length} vấn đề cần xem (${errorCount} nghiêm trọng)`
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Tài khoản"
          value={report.authUserCount}
          hint={
            report.testAccountCount > 0
              ? `${report.testAccountCount} tài khoản test`
              : "không có tài khoản test"
          }
        />
        <StatCard
          label="Lớp"
          value={countOf(report.counts, "classes")}
          hint={`${countOf(report.counts, "courses")} khóa học`}
        />
        <StatCard
          label="Ghi danh"
          value={countOf(report.counts, "enrollments")}
          hint={`${countOf(report.counts, "sessions")} buổi học`}
        />
        <StatCard
          label="Nhận xét"
          value={countOf(report.counts, "student_reviews")}
          hint={`${countOf(report.counts, "review_options")} câu mẫu`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Toàn vẹn dữ liệu</h2>
        {report.issues.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">Không phát hiện vấn đề</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Không có hồ sơ mồ côi, ghi danh treo hay file Storage thừa.
            </p>
          </div>
        ) : (
          report.issues.map((issue) => (
            <div
              key={issue.key}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    issue.severity === "error" ? "destructive" : "secondary"
                  }
                >
                  {issue.severity === "error" ? "Nghiêm trọng" : "Cần chú ý"}
                </Badge>
                <p className="font-medium">{issue.title}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{issue.detail}</p>
              <ul className="mt-2 space-y-0.5 text-sm">
                {issue.items.slice(0, 10).map((item) => (
                  <li key={item} className="font-mono text-xs break-all">
                    {item}
                  </li>
                ))}
                {issue.items.length > 10 ? (
                  <li className="text-xs text-muted-foreground">
                    …và {issue.items.length - 10} mục nữa
                  </li>
                ) : null}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Công cụ dọn dẹp</h2>
        <div className="flex flex-wrap gap-6 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium">Tài khoản test</p>
            <p className="mb-2 max-w-md text-xs text-muted-foreground">
              Xóa tài khoản do script E2E sinh ra (khớp tiền tố cố định, không
              đụng tài khoản thật).
            </p>
            <OpsActionButton
              label={`Dọn ${report.testAccountCount} tài khoản test`}
              title="Xóa tài khoản test?"
              description={`Sẽ xóa vĩnh viễn ${report.testAccountCount} tài khoản khớp tiền tố của script E2E. Không thể hoàn tác.`}
              confirmLabel="Xóa"
              action={purgeTestUsers}
              disabled={report.testAccountCount === 0}
            />
          </div>
          <div>
            <p className="text-sm font-medium">File đề mồ côi</p>
            <p className="mb-2 max-w-md text-xs text-muted-foreground">
              Xóa file trong bucket không còn đề bài nào trỏ tới. File mới hơn 1
              giờ được bỏ qua, phòng khi đang trong luồng tạo đề.
            </p>
            <OpsActionButton
              label={`Dọn ${report.orphanFiles.length} file`}
              title="Xóa file mồ côi?"
              description={`Sẽ xóa vĩnh viễn ${report.orphanFiles.length} file khỏi Storage. Danh sách được tính lại lúc bấm. Không thể hoàn tác.`}
              confirmLabel="Xóa"
              action={cleanupOrphanSpecFiles}
              disabled={report.orphanFiles.length === 0}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Tài khoản ({report.accounts.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Tạo lúc</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.username}
                    {account.isTest ? (
                      <Badge variant="outline" className="ml-2">
                        test
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {account.profileName ?? (
                      <span className="text-destructive">thiếu hồ sơ</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.role ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.createdAt.slice(0, 10)}
                  </TableCell>
                  <TableCell>
                    {account.emailConfirmed ? (
                      <span className="text-xs text-muted-foreground">OK</span>
                    ) : (
                      <ConfirmEmailButton userId={account.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Số dòng theo bảng</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border bg-card p-4 text-sm shadow-sm sm:grid-cols-3">
          {report.counts.map((row) => (
            <div key={row.table} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">{row.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
