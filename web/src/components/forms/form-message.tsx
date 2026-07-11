import type { ActionResult } from "@/lib/types";

export function FormMessage({ result }: { result: ActionResult }) {
  if (result.error) {
    return <p className="text-sm text-destructive">{result.error}</p>;
  }
  if (result.success) {
    return <p className="text-sm text-green-600">{result.success}</p>;
  }
  return null;
}
