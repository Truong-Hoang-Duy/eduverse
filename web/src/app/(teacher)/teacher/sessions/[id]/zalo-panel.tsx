"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

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
import { generateZaloSummary } from "@/lib/actions/zalo";
import { zaloMarkupToHtml, zaloMarkupToPlainText } from "@/lib/zalo-format";

export interface TemplateChoice {
  id: string;
  name: string;
}

export function ZaloPanel({
  sessionId,
  templates,
}: {
  sessionId: string;
  templates: TemplateChoice[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startGenerate] = useTransition();

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 space-y-1.5">
          <Label>Mẫu tin</Label>
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
        <Button onClick={handleGenerate} disabled={pending || !templateId} size="sm">
          {pending ? "AI đang tổng hợp..." : "✨ Tạo tin nhắn"}
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
