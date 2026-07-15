"use client";

import { useActionState, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteApiKey, saveApiKey } from "@/lib/actions/api-key";
import type { ActionResult } from "@/lib/types";

const STEPS = [
  "Mở aistudio.google.com/apikey và đăng nhập bằng tài khoản Google.",
  'Bấm "Create API key" → chọn project bất kỳ (hoặc tạo mới).',
  "Copy key vừa hiện ra (bắt đầu bằng AIza...).",
  "Dán vào ô bên dưới rồi bấm Lưu.",
];

export function ApiKeyForm({ maskedKey }: { maskedKey: string | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveApiKey,
    {}
  );
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🔑 API key Gemini của riêng bạn</CardTitle>
        <CardDescription>
          Tùy chọn. Chưa đặt thì các tính năng AI dùng chung key của hệ thống —
          nhiều người dùng cùng lúc sẽ nhanh hết lượt. Đặt key riêng để có hạn
          mức riêng (miễn phí 1.500 lượt/ngày).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {maskedKey && !editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Key đang dùng</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
                {maskedKey}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Đổi key
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm">
                    Xóa key
                  </Button>
                }
                title="Xóa API key riêng?"
                description="Các tính năng AI của bạn sẽ quay lại dùng key mặc định của hệ thống (dùng chung với mọi người)."
                confirmLabel="Xóa key"
                action={deleteApiKey}
                fields={{}}
              />
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="api_key">API key</Label>
              <Input
                id="api_key"
                name="api_key"
                type="password"
                placeholder="AIza..."
                autoComplete="off"
                required
              />
            </div>
            <FormMessage result={state} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Đang lưu..." : "Lưu key"}
              </Button>
              {maskedKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Hủy
                </Button>
              )}
            </div>
          </form>
        )}

        <details className="rounded-lg border bg-muted/30 p-3">
          <summary className="cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
            ❓ Cách lấy API key miễn phí từ Google AI Studio
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-primary underline"
          >
            Mở Google AI Studio ↗
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Hoàn toàn miễn phí, không cần thẻ tín dụng. Đừng chia sẻ key cho người
            khác — ai có key sẽ dùng hết hạn mức của bạn.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}
