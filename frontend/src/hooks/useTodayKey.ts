import { useNow } from "@/hooks/useNow";
import { toDateKey } from "@/utils/dates";

// Refresh a screen across midnight, including when a PWA resumes from suspension.
export function useTodayKey(): string {
  return toDateKey(new Date(useNow(30_000)));
}
