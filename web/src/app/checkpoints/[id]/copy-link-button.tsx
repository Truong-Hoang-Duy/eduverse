"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "h-8 gap-1.5 text-xs font-medium transition-colors shadow-2xs",
        copied
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "hover:bg-accent"
      )}
    >
      <span>{copied ? "✓" : "🔗"}</span>
      <span>{copied ? "Đã sao chép link!" : "Copy link đề bài"}</span>
    </Button>
  );
}
