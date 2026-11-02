"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  generateSessionGreeting,
  generateZaloSummary,
} from "@/lib/actions/zalo";
import { SESSION_FORMATS, type SessionFormat } from "@/lib/session-format";
import { zaloMarkupToHtml, zaloMarkupToPlainText } from "@/lib/zalo-format";
import { findBestMatchingZaloTemplate } from "@/lib/zalo-template-matcher";

export interface TemplateChoice {
  id: string;
  name: string;
}

export function ZaloPanel({
  sessionId,
  sessionNumber,
  sessionFormat = "standard",
  classCode,
  courseName,
  teacherName,
  templates,
}: {
  sessionId: string;
  sessionNumber?: number;
  sessionFormat?: SessionFormat;
  classCode?: string;
  courseName?: string;
  teacherName?: string;
  templates: TemplateChoice[];
}) {
  const bestTemplate = useMemo(
    () => findBestMatchingZaloTemplate(templates, sessionFormat),
    [templates, sessionFormat]
  );

  const [templateId, setTemplateId] = useState(
    () => bestTemplate?.id ?? templates[0]?.id ?? ""
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startGenerate] = useTransition();
  const [pendingGreeting, startGenerateGreeting] = useTransition();

  // Tự động chuyển mẫu phù hợp khi mở buổi học hoặc khi hình thức buổi học thay đổi
  useEffect(() => {
    if (bestTemplate?.id) {
      setTemplateId(bestTemplate.id);
    }
  }, [sessionId, sessionFormat, bestTemplate?.id]);

  function handleGenerate() {
    setError("");
    setCopied(false);
    startGenerate(async () => {
      const res = await generateZaloSummary({ sessionId, templateId });
      if (res.error) {
        setError(res.error);
      } else {
        setMessage(res.message ?? "");
      }
    });
  }

  function handleGenerateGreeting() {
    setError("");
    setCopied(false);
    startGenerateGreeting(async () => {
      const res = await generateSessionGreeting({
        classCode: classCode ?? "",
        courseName: courseName ?? "",
        teacherName: teacherName ?? "",
      });
      if (res.error) {
        setError(res.error);
      } else {
        setMessage(res.greeting ?? "");
      }
    });
  }

  async function handleCopy() {
    const plain = zaloMarkupToPlainText(message);
    try {
      // Ghi cả text/html lẫn text/plain: khung chat Zalo PC (contenteditable)
      // đọc text/html khi dán nên đậm/nghiêng/bullet lên đúng — xem
      // .claude/docs/DECISIONS.md (nghiên cứu 2026-09-04).
      const item = new ClipboardItem({
        "text/html": new Blob([zaloMarkupToHtml(message)], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
    } catch {
      // Trình duyệt không hỗ trợ ClipboardItem đa định dạng → copy chữ thường.
      await navigator.clipboard.writeText(plain);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có mẫu tin nào —{" "}
        <Link href="/teacher/settings" className="text-primary underline">
          tạo mẫu trong trang Cài đặt
        </Link>{" "}
        trước nhé.
      </p>
    );
  }

  const formatConfig = SESSION_FORMATS[sessionFormat];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <Label>Mẫu tin</Label>
            <span
              className="text-[11px] text-muted-foreground"
              title={`Tự động chọn theo hình thức: ${formatConfig.label}`}
            >
              Theo {formatConfig.shortLabel}
            </span>
          </div>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn mẫu" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {sessionNumber === 1 && (
          <Button onClick={handleGenerateGreeting} disabled={pendingGreeting} variant="secondary" size="sm">
            {pendingGreeting ? "AI đang viết..." : "🌟 Tạo lời chào (Buổi 1)"}
          </Button>
        )}
        <Button onClick={handleGenerate} disabled={pending || !templateId} size="sm">
          {pending ? "AI đang tổng hợp..." : "✨ Tạo tin nhắn Zalo"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {message && (
        <div className="space-y-2">
          <Textarea
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Gõ {"**đậm**"}, {"_nghiêng_"}, dòng bắt đầu bằng {'"- "'} thành gạch đầu
            dòng — sửa trực tiếp ở đây nếu AI viết sai.
          </p>
          <Button onClick={handleCopy} size="sm" variant="outline">
            {copied ? "✓ Đã copy — dán vào nhóm Zalo" : "📋 Copy tin nhắn"}
          </Button>
        </div>
      )}
    </div>
  );
}
