"use client";

import { useActionState, useState, useTransition } from "react";

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
import {
  type AiProvider,
  type ApiKeyInfo,
  deleteApiKey,
  deleteOpenAiApiKey,
  saveApiKey,
  saveOpenAiApiKey,
  setProvider,
  setUseOwnKey,
} from "@/lib/actions/api-key";
import type { ActionResult } from "@/lib/types";

const GEMINI_STEPS = [
  "Mở aistudio.google.com/apikey và đăng nhập bằng tài khoản Google.",
  'Bấm "Create API key" → chọn project bất kỳ (hoặc tạo mới).',
  "Copy TOÀN BỘ key vừa hiện ra.",
  "Dán vào ô bên dưới rồi bấm Lưu.",
];

function ActiveBadge() {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      Đang dùng
    </span>
  );
}

function SwitchButton({
  onClick,
  pending,
  label,
}: {
  onClick: () => void;
  pending: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={pending}
    >
      {label}
    </Button>
  );
}

export function ApiKeyForm({ info }: { info: ApiKeyInfo }) {
  const { provider, gemini, openai } = info;

  const [switchError, setSwitchError] = useState("");
  const [switchPending, startSwitch] = useTransition();

  function handleSwitch(next: AiProvider) {
    setSwitchError("");
    startSwitch(async () => {
      const res = await setProvider(next);
      if (res.error) setSwitchError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🔑 Provider AI của bạn</CardTitle>
        <CardDescription>
          Mặc định dùng Gemini — miễn phí, dùng key hệ thống nếu bạn chưa đặt
          key riêng. Muốn đổi sang OpenAI (gpt-5.6-luna) thì PHẢI tự nhập API
          key riêng của bạn — hệ thống không có key OpenAI dùng chung.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {switchError && (
          <p className="text-sm text-destructive">{switchError}</p>
        )}

        <GeminiSection
          info={gemini}
          active={provider === "gemini"}
          onActivate={() => handleSwitch("gemini")}
          switchPending={switchPending}
        />

        <OpenAiSection
          info={openai}
          active={provider === "openai"}
          onActivate={() => handleSwitch("openai")}
          switchPending={switchPending}
        />
      </CardContent>
    </Card>
  );
}

function GeminiSection({
  info,
  active,
  onActivate,
  switchPending,
}: {
  info: ApiKeyInfo["gemini"];
  active: boolean;
  onActivate: () => void;
  switchPending: boolean;
}) {
  const { maskedKey, useOwnKey } = info;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveApiKey,
    {}
  );
  const [editing, setEditing] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [togglePending, startToggle] = useTransition();

  function handleToggle(enabled: boolean) {
    setToggleError("");
    startToggle(async () => {
      const res = await setUseOwnKey(enabled);
      if (res.error) setToggleError(res.error);
    });
  }

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Gemini</h3>
        {active ? (
          <ActiveBadge />
        ) : (
          <SwitchButton onClick={onActivate} pending={switchPending} label="Dùng Gemini" />
        )}
      </div>

      {maskedKey && !editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Key đang dùng</Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
              {maskedKey}
            </p>
          </div>

          {/* Công tắc bật/tắt dùng key riêng — tắt thì tạm dùng key hệ thống
              nhưng KHÔNG xóa key đã lưu. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={useOwnKey}
              disabled={togglePending}
              onChange={(e) => handleToggle(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span className="text-sm">
              <span className="font-medium">Dùng key riêng của tôi</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {useOwnKey
                  ? "Đang bật — các tính năng AI dùng key riêng của bạn (khi provider là Gemini)."
                  : "Đang tắt — tạm dùng key hệ thống. Key riêng vẫn được lưu, bật lại bất cứ lúc nào."}
              </span>
            </span>
          </label>
          {toggleError && (
            <p className="text-sm text-destructive">{toggleError}</p>
          )}

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
              title="Xóa API key Gemini riêng?"
              description="Các tính năng AI của bạn sẽ quay lại dùng key mặc định của hệ thống (dùng chung với mọi người) khi provider là Gemini. Nếu chỉ muốn tạm dùng key hệ thống thì TẮT công tắc phía trên là đủ, không cần xóa."
              confirmLabel="Xóa key"
              action={deleteApiKey}
              fields={{}}
            />
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="api_key">API key Gemini</Label>
            <Input
              id="api_key"
              name="api_key"
              type="password"
              placeholder="Dán API key vào đây"
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
          {GEMINI_STEPS.map((step) => (
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
    </section>
  );
}

function OpenAiSection({
  info,
  active,
  onActivate,
  switchPending,
}: {
  info: ApiKeyInfo["openai"];
  active: boolean;
  onActivate: () => void;
  switchPending: boolean;
}) {
  const { maskedKey } = info;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveOpenAiApiKey,
    {}
  );
  const [editing, setEditing] = useState(false);

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">OpenAI (gpt-5.6-luna)</h3>
        {active ? (
          <ActiveBadge />
        ) : (
          maskedKey && (
            <SwitchButton onClick={onActivate} pending={switchPending} label="Dùng OpenAI" />
          )
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tùy chọn opt-in — KHÔNG có key mặc định của hệ thống cho OpenAI. Phải
        tự nhập API key riêng của bạn (tự trả phí bên OpenAI) mới dùng được.
      </p>

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
              title="Xóa API key OpenAI?"
              description={
                active
                  ? "Bạn đang dùng OpenAI — xóa key sẽ tự chuyển về dùng Gemini ngay, vì hệ thống không có key OpenAI dự phòng."
                  : "Key OpenAI riêng của bạn sẽ bị xóa hẳn."
              }
              confirmLabel="Xóa key"
              action={deleteOpenAiApiKey}
              fields={{}}
            />
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="openai_api_key">API key OpenAI</Label>
            <Input
              id="openai_api_key"
              name="openai_api_key"
              type="password"
              placeholder="Dán API key vào đây"
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

      <a
        href="https://platform.openai.com/api-keys"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-primary underline"
      >
        Mở trang tạo API key OpenAI ↗
      </a>
    </section>
  );
}
