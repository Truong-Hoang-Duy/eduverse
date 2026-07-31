import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/get-profile";

export const metadata = { title: "Hướng dẫn nộp bài — Eduverse" };

// Dán link YouTube đầy đủ (watch?v=... / youtu.be/... / shorts/...) hoặc ID
// thuần đều được. Để trống ("") thì hiện ô chờ thay vì video.
const VIDEOS = {
  github: "https://www.youtube.com/watch?v=jVAeaIb-Kyg",
  drive: "https://www.youtube.com/watch?v=NWEu-bCUuLM",
  deploy: "https://www.youtube.com/watch?v=X6boIuWzBhg",
  apikey: "https://www.youtube.com/watch?v=JZCjL3hrvcY",
};

/** Tách video ID từ link YouTube mọi dạng; trả "" nếu không nhận ra. */
function toVideoId(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  if (/^[\w-]{11}$/.test(raw)) return raw; // đã là ID thuần
  const match = raw.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return match?.[1] ?? "";
}

const SECTIONS = [
  {
    key: "github" as const,
    title: "1. Đưa mã nguồn lên GitHub",
    description: "Tạo repository và push code lên GitHub để lưu trữ và chia sẻ.",
    steps: [
      "Tạo tài khoản GitHub (miễn phí) và một repository mới.",
      "Cài Git, chạy git init trong thư mục dự án.",
      "git add . → git commit -m \"first commit\" → git push lên repo.",
      "Copy đường link repo dán vào ô 'Link GitHub' của sản phẩm.",
    ],
  },
  {
    key: "drive" as const,
    title: "2. Tải mã nguồn lên Google Drive",
    description: "Nén dự án thành file .zip và tải lên Drive để nộp bản sao.",
    steps: [
      "Nén thư mục dự án thành file .zip (bỏ qua node_modules).",
      "Tải file .zip lên Google Drive.",
      "Chuột phải → Chia sẻ → 'Bất kỳ ai có đường liên kết'.",
      "Copy link dán vào ô 'Link Google Drive'.",
    ],
  },
  {
    key: "deploy" as const,
    title: "3. Deploy demo miễn phí",
    description: "Đưa dự án lên mạng để demo bằng Vercel hoặc GitHub Pages.",
    steps: [
      "Với web tĩnh: bật GitHub Pages trong Settings của repo.",
      "Với Next.js/React: đăng nhập Vercel bằng GitHub, import repo, bấm Deploy.",
      "Chờ deploy xong, lấy link dạng ...vercel.app hoặc ...github.io.",
      "Copy link dán vào ô 'Link demo'.",
    ],
  },
  {
    key: "apikey" as const,
    title: "4. Lấy API key Gemini miễn phí (để dùng AI riêng)",
    description:
      "Cả lớp đang dùng chung một key nên rất dễ hết lượt. Có key riêng thì em có hạn mức riêng, miễn phí, không cần thẻ.",
    steps: [
      "Mở aistudio.google.com/apikey, đăng nhập bằng tài khoản Google.",
      'Bấm "Create API key" → chọn project bất kỳ (hoặc tạo mới).',
      "Copy TOÀN BỘ key vừa hiện ra.",
      "Vào Hồ sơ (menu góc phải) → dán vào ô API key → Lưu.",
      "Không chia sẻ key cho ai — người có key sẽ dùng hết lượt của bạn.",
    ],
  },
];

export default async function GuidePage() {
  await requireRole("student");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hướng dẫn nộp bài"
        description="Cách đưa sản phẩm cuối khóa lên GitHub, Google Drive và deploy demo"
      />

      {SECTIONS.map((section) => {
        const videoId = toVideoId(VIDEOS[section.key]);
        return (
          <Card key={section.key} className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="aspect-video overflow-hidden rounded-lg border">
                {videoId ? (
                  <iframe
                    className="size-full"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                    title={section.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted/50 text-center text-sm text-muted-foreground">
                    📹 Video hướng dẫn sẽ được thêm sau
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
