import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { subscribeTheme, getResolvedTheme, toggleTheme } from "../lib/themeStore";

// Compact light⇄dark control. Starts on the OS preference ("system") and
// becomes explicit once tapped. Rendered as a small pill so it fits in
// account preferences without dominating them.
export function ThemeToggle() {
  const resolved = useSyncExternalStore(subscribeTheme, getResolvedTheme);
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border border-border bg-input transition-colors cursor-pointer"
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card text-primary shadow-sm transition-transform duration-200 ${
          isDark ? "translate-x-[24px]" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={12} strokeWidth={2.5} /> : <Sun size={13} strokeWidth={2.5} />}
      </span>
    </button>
  );
}
