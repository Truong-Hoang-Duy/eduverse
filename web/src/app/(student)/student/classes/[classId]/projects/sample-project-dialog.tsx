"use client";

import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Globe,
  Laptop,
  Layout,
  Lightbulb,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const SAMPLE_PROJECT = {
  name: "Website quản lý thư viện",
  description:
    "Dự án xây dựng hệ thống quản lý thư viện cho trường học, giúp thủ thư quản lý sách, độc giả mượn/trả sách dễ dàng hơn thay vì ghi chép thủ công bằng sổ giấy. Ý tưởng xuất phát từ việc quan sát thấy thư viện trường thường xuyên bị thất lạc sách và mất nhiều thời gian tìm kiếm.",
  features: [
    "Đăng nhập / Đăng ký tài khoản",
    "Tìm kiếm sách theo tên, tác giả, thể loại",
    "Mượn sách / Trả sách trực tuyến",
    "Quản lý danh mục sách (thêm, sửa, xóa - dành cho admin)",
    "Xem lịch sử mượn trả của độc giả",
    "Thông báo nhắc nhở sách quá hạn",
    "Thống kê các đầu sách được mượn nhiều nhất",
  ],
  repoUrl: "https://github.com/hocvien/website-quan-ly-thu-vien",
  demoUrl: "https://thu-vien-truong.vercel.app",
  canvasUrl: "https://www.canva.com/design/sample-library-presentation",
};

export function SampleProjectDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 transition-all shadow-2xs"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Bài mẫu</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] sm:max-w-4xl lg:max-w-5xl overflow-hidden rounded-2xl border-border/80 shadow-2xl p-0 flex flex-col"
      >
        {/* Header gọn gàng, thanh lịch */}
        <DialogHeader className="px-6 sm:px-7 py-3 border-b bg-muted/20 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                <BookOpen className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    Bài mẫu sản phẩm cuối khóa
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/30 text-[11px] px-2 py-0.2 font-semibold"
                  >
                    Tham khảo chuẩn
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Xem cấu trúc và cách trình bày một sản phẩm hoàn chỉnh để chuẩn bị tốt cho bài của bạn.
                </DialogDescription>
              </div>
            </div>

            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-7.5 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                ✕
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Body hiển thị vừa vặn, thoáng đãng, không sinh thanh cuộn */}
        <div className="px-6 sm:px-7 py-3.5 sm:py-4 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Cột trái: Thông tin tổng quan (7 phần) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Tên dự án mẫu */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tên dự án mẫu
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Ngắn gọn, rõ mục tiêu
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm sm:text-base font-bold text-primary shadow-2xs">
                  <Laptop className="size-4.5 shrink-0 text-primary" />
                  <span>{SAMPLE_PROJECT.name}</span>
                </div>
              </div>

              {/* Mô tả dự án mẫu */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Mô tả dự án mẫu
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Làm gì • Cho ai • Ý tưởng từ đâu
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-card p-3 text-xs sm:text-sm text-foreground/95 leading-relaxed shadow-2xs">
                  <p>{SAMPLE_PROJECT.description}</p>
                </div>
              </div>

              {/* Liên kết tham khảo mẫu */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Liên kết minh họa
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-2 shadow-2xs">
                    <Code2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        Link GitHub
                      </div>
                      <div className="truncate font-mono text-[11px] font-medium text-foreground/90 mt-0.5">
                        {SAMPLE_PROJECT.repoUrl}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-2 shadow-2xs">
                    <Globe className="size-3.5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        Link Demo
                      </div>
                      <div className="truncate font-mono text-[11px] font-medium text-foreground/90 mt-0.5">
                        {SAMPLE_PROJECT.demoUrl}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card p-2 shadow-2xs">
                    <Layout className="size-3.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        Link Canvas
                      </div>
                      <div className="truncate font-mono text-[11px] font-medium text-foreground/90 mt-0.5">
                        {SAMPLE_PROJECT.canvasUrl}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Danh sách tính năng & Mẹo (5 phần) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Các chức năng */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Các chức năng mẫu ({SAMPLE_PROJECT.features.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Tối thiểu 3 - 5 chức năng
                  </span>
                </div>
                <div className="space-y-1 rounded-xl border border-border/80 bg-card p-2 shadow-2xs">
                  {SAMPLE_PROJECT.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
                    >
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      <span className="flex-1 leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lời khuyên nhanh */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400">
                  <Lightbulb className="size-3.5 shrink-0" />
                  <span>Mẹo trình bày sản phẩm tốt</span>
                </div>
                <ul className="space-y-0.5 text-[11px] text-foreground/80 leading-normal pl-3.5 list-disc">
                  <li>Tên dự án nên súc tích, phản ánh đúng chức năng chính.</li>
                  <li>Mô tả rõ ràng vấn đề thực tế mà sản phẩm giải quyết.</li>
                  <li>Liệt kê từng tính năng độc lập để giáo viên và các bạn dễ theo dõi.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Gọn gàng, khoảng cách chuẩn mực, nút đóng vừa vặn */}
        <div className="px-6 sm:px-7 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-end rounded-b-2xl">
          <DialogClose asChild>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="px-6 text-sm font-semibold h-9 shadow-xs cursor-pointer"
            >
              Đóng
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
