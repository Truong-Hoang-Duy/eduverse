// Thu thập số liệu vận hành cho /teacher/admin.
//
// Đây là bản web của `scripts/check-integrity.mjs` + phần Supabase Studio KHÔNG
// làm được: đối chiếu auth.users với profiles, và dò file Storage mồ côi (bucket
// không cascade theo khóa ngoại nên xóa dòng mà quên file là bỏ rác vĩnh viễn).
import "server-only";

import { SPEC_BUCKET } from "@/lib/spec-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import testUserPrefixes from "@/lib/test-user-prefixes.json";

/**
 * Tiền tố tài khoản do các script `e2e-*.mjs` sinh ra — đọc từ NGUỒN DUY NHẤT
 * `test-user-prefixes.json` (JSON vì `scripts/purge-test-users.mjs` chạy bằng
 * Node thuần, không import được `.ts`). Trước đây danh sách này bị chép ở 2 nơi
 * và đã lệch thật: `dl.`/`e4.`/`ek.` thiếu nên script dọn không thấy tài khoản
 * của 3 bộ E2E đó.
 */
export const TEST_USER_PREFIXES: readonly string[] = testUserPrefixes.prefixes;

/**
 * `createAssignment` upload file TRƯỚC rồi mới insert dòng (có rollback nếu
 * insert hỏng), nên luôn có một khoảnh khắc file tồn tại mà chưa có dòng trỏ
 * tới. Chừa 1 giờ để không báo nhầm file đang trong luồng tạo là rác.
 */
const ORPHAN_FILE_GRACE_MS = 60 * 60 * 1000;

export interface TableCount {
  table: string;
  label: string;
  count: number;
}

export interface AccountRow {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  emailConfirmed: boolean;
  profileName: string | null;
  role: string | null;
  isTest: boolean;
}

export interface OrphanFile {
  path: string;
  createdAt: string | null;
  sizeBytes: number | null;
}

export type IssueSeverity = "error" | "warning";

export interface OpsIssue {
  key: string;
  severity: IssueSeverity;
  title: string;
  /** Mô tả hậu quả + cách xử lý, tiếng Việt. */
  detail: string;
  items: string[];
}

export interface OpsReport {
  counts: TableCount[];
  accounts: AccountRow[];
  issues: OpsIssue[];
  orphanFiles: OrphanFile[];
  testAccountCount: number;
  authUserCount: number;
}

const COUNTED_TABLES: { table: string; label: string }[] = [
  { table: "profiles", label: "Hồ sơ" },
  { table: "courses", label: "Khóa học" },
  { table: "classes", label: "Lớp" },
  { table: "enrollments", label: "Ghi danh" },
  { table: "sessions", label: "Buổi học" },
  { table: "student_reviews", label: "Nhận xét" },
  { table: "review_options", label: "Câu nhận xét mẫu" },
  { table: "assignments", label: "Đề bài" },
  { table: "projects", label: "Sản phẩm" },
  { table: "project_comments", label: "Bình luận" },
  { table: "zalo_templates", label: "Mẫu Zalo" },
  { table: "user_secrets", label: "API key đã lưu" },
];

/** Username của hệ thống nằm ở phần trước @ của email ảo `<username>@eduverse.local`. */
function usernameFromEmail(email: string | undefined): string {
  return (email ?? "").split("@")[0];
}

function isTestAccount(username: string): boolean {
  return TEST_USER_PREFIXES.some((prefix) => username.startsWith(prefix));
}

/**
 * Liệt kê mọi file trong bucket đề bài. Path có dạng `<courseId>/<file>` nên
 * phải duyệt hai tầng — `list()` ở gốc chỉ trả về tên thư mục.
 */
async function listAllSpecFiles(
  admin: ReturnType<typeof createAdminClient>
): Promise<OrphanFile[]> {
  // limit mặc định của Storage là 100 — không nâng lên là bỏ sót từ khóa thứ 101.
  const { data: folders, error } = await admin.storage
    .from(SPEC_BUCKET)
    .list(undefined, { limit: 1000 });
  if (error || !folders) return [];

  const files: OrphanFile[] = [];
  for (const folder of folders) {
    // Thư mục: Supabase trả về entry không có id. File nằm thẳng ở gốc thì hiếm
    // nhưng vẫn tính, để không bỏ sót rác cũ.
    if (folder.id) {
      files.push({
        path: folder.name,
        createdAt: folder.created_at ?? null,
        sizeBytes: null,
      });
      continue;
    }

    const { data: inner } = await admin.storage
      .from(SPEC_BUCKET)
      .list(folder.name, { limit: 1000 });
    for (const file of inner ?? []) {
      files.push({
        path: `${folder.name}/${file.name}`,
        createdAt: file.created_at ?? null,
        sizeBytes:
          typeof file.metadata?.size === "number" ? file.metadata.size : null,
      });
    }
  }
  return files;
}

/**
 * File trong bucket không còn dòng `assignments` nào trỏ tới.
 *
 * Tách riêng để action dọn file TỰ TÍNH LẠI danh sách: nếu nhận path do client
 * gửi lên thì người dùng sửa form là ép xóa được cả file đang dùng.
 */
export async function findOrphanSpecFiles(
  admin: ReturnType<typeof createAdminClient>
): Promise<OrphanFile[]> {
  const [{ data: assignments }, specFiles] = await Promise.all([
    admin.from("assignments").select("spec_file_path, attachment_file_paths"),
    listAllSpecFiles(admin),
  ]);

  const referenced = new Set<string>();
  for (const a of assignments ?? []) {
    if (a.spec_file_path) referenced.add(a.spec_file_path);
    const row = a as unknown as { attachment_file_paths?: string[] };
    if (Array.isArray(row.attachment_file_paths)) {
      for (const p of row.attachment_file_paths) {
        if (p) referenced.add(p);
      }
    }
  }
  const graceCutoff = Date.now() - ORPHAN_FILE_GRACE_MS;

  return specFiles.filter((file) => {
    if (referenced.has(file.path)) return false;
    if (!file.createdAt) return true;
    return new Date(file.createdAt).getTime() < graceCutoff;
  });
}

/** Gom toàn bộ số liệu + vấn đề dữ liệu. Chỉ đọc, không sửa gì. */
export async function buildOpsReport(): Promise<OpsReport> {
  const admin = createAdminClient();

  const [
    { data: authData },
    { data: profiles },
    { data: courses },
    { data: classes },
    { data: enrollments },
    orphanFiles,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, username, full_name, role"),
    admin.from("courses").select("id, code, name, teacher_id"),
    admin.from("classes").select("id, class_code, teacher_id"),
    admin.from("enrollments").select("id, class_id, student_id"),
    findOrphanSpecFiles(admin),
  ]);

  const counts = await Promise.all(
    COUNTED_TABLES.map(async ({ table, label }) => {
      const { count } = await admin
        // Danh sách bảng là hằng số ở trên, nhưng .from() cần literal type nên
        // phải ép kiểu ở đúng một chỗ này.
        .from(table as "profiles")
        .select("*", { count: "exact", head: true });
      return { table, label, count: count ?? 0 };
    })
  );

  const authUsers = authData?.users ?? [];
  const profileRows = profiles ?? [];
  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  const authIds = new Set(authUsers.map((u) => u.id));

  const accounts: AccountRow[] = authUsers
    .map((user) => {
      const username = usernameFromEmail(user.email);
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        username,
        createdAt: user.created_at,
        emailConfirmed: Boolean(user.email_confirmed_at),
        profileName: profile?.full_name ?? null,
        role: profile?.role ?? null,
        isTest: isTestAccount(username),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const issues: OpsIssue[] = [];

  const missingProfile = accounts.filter((a) => a.profileName === null);
  if (missingProfile.length > 0) {
    issues.push({
      key: "auth-without-profile",
      severity: "error",
      title: `${missingProfile.length} tài khoản đăng nhập không có hồ sơ`,
      detail:
        "Đăng nhập được nhưng vào app sẽ lỗi vì mọi trang đều đọc profiles. Thường do xóa tay dòng profiles trên Studio. Cách sửa: xóa hẳn tài khoản rồi tạo lại.",
      items: missingProfile.map((a) => `${a.username} (tạo ${a.createdAt.slice(0, 10)})`),
    });
  }

  const orphanProfiles = profileRows.filter((p) => !authIds.has(p.id));
  if (orphanProfiles.length > 0) {
    issues.push({
      key: "profile-without-auth",
      severity: "error",
      title: `${orphanProfiles.length} hồ sơ mồ côi (không còn tài khoản đăng nhập)`,
      detail:
        "Hồ sơ còn nằm trong bảng profiles nhưng auth user đã bị xóa — tên vẫn hiện trong danh sách lớp mà không ai đăng nhập được. Xóa dòng profiles đó trên Studio.",
      items: orphanProfiles.map((p) => `${p.username ?? "(không username)"} — ${p.full_name}`),
    });
  }

  const orphanEnrollments = (enrollments ?? []).filter(
    (e) => !profileById.has(e.student_id)
  );
  if (orphanEnrollments.length > 0) {
    issues.push({
      key: "orphan-enrollment",
      severity: "error",
      title: `${orphanEnrollments.length} ghi danh trỏ tới học viên không tồn tại`,
      detail:
        "Sĩ số lớp đếm sai và trang nhận xét sẽ hiện ô trống. Xóa các dòng enrollments này.",
      items: orphanEnrollments.map((e) => `enrollment ${e.id.slice(0, 8)}… → student ${e.student_id.slice(0, 8)}…`),
    });
  }

  const teacherIds = new Set(
    profileRows.filter((p) => p.role === "teacher").map((p) => p.id)
  );
  const orphanCourses = (courses ?? []).filter((c) => !teacherIds.has(c.teacher_id));
  const orphanClasses = (classes ?? []).filter((c) => !teacherIds.has(c.teacher_id));
  if (orphanCourses.length + orphanClasses.length > 0) {
    issues.push({
      key: "orphan-owner",
      severity: "error",
      title: `${orphanCourses.length + orphanClasses.length} khóa/lớp mất giáo viên chủ`,
      detail:
        "RLS lọc theo teacher_id nên không giáo viên nào còn thấy được các dòng này — chúng vô hình trong app nhưng vẫn chiếm dữ liệu. Gán lại teacher_id hoặc xóa.",
      items: [
        ...orphanCourses.map((c) => `khóa ${c.code} — ${c.name}`),
        ...orphanClasses.map((c) => `lớp ${c.class_code}`),
      ],
    });
  }

  const unconfirmed = accounts.filter((a) => !a.emailConfirmed);
  if (unconfirmed.length > 0) {
    issues.push({
      key: "unconfirmed-email",
      severity: "warning",
      title: `${unconfirmed.length} tài khoản chưa xác nhận email`,
      detail:
        "Email ảo @eduverse.local không nhận được thư xác nhận, nên tài khoản kẹt ở đây là không đăng nhập được. Bấm “Xác nhận” ở bảng tài khoản bên dưới để mở khóa.",
      items: unconfirmed.map((a) => a.username),
    });
  }

  if (orphanFiles.length > 0) {
    issues.push({
      key: "orphan-spec-file",
      severity: "warning",
      title: `${orphanFiles.length} file đề mồ côi trong Storage`,
      detail:
        "File không còn dòng assignments nào trỏ tới — Storage không cascade theo khóa ngoại nên chúng nằm lại vĩnh viễn và ăn dung lượng free tier. Dùng nút dọn bên dưới.",
      items: orphanFiles.map((f) => f.path),
    });
  }

  return {
    counts,
    accounts,
    issues,
    orphanFiles,
    testAccountCount: accounts.filter((a) => a.isTest).length,
    authUserCount: authUsers.length,
  };
}
