const MODIFIER_KEYS = new Set(["Control", "Ctrl", "Shift", "Alt", "Meta"]);

const LEGACY_SHORTCUTS: Record<string, string> = {
  "ctrl-space": "Ctrl+Space",
  "cmd-space": "Meta+Space",
  "alt-slash": "Alt+/",
  "ctrl-slash": "Ctrl+/",
};

const RESERVED_SHORTCUTS = new Set(["Ctrl+Space", "Meta+Space"]);

function normalizePart(part: string): string {
  const trimmed = part.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "control" || lower === "ctrl") return "Ctrl";
  if (lower === "command" || lower === "cmd" || lower === "meta") return "Meta";
  if (lower === "option" || lower === "alt") return "Alt";
  if (lower === "shift") return "Shift";
  if (lower === "space" || lower === "spacebar") return "Space";
  if (lower === "slash") return "/";
  if (trimmed.length === 1) return trimmed.toUpperCase();
  return trimmed;
}

function normalizeEventKey(event: Pick<KeyboardEvent, "key" | "code">): string {
  if (event.code === "Space" || event.key === " " || event.key === "Spacebar") {
    return "Space";
  }
  if (event.code === "Slash" || event.key === "/") {
    return "/";
  }
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }
  if (/^Digit\d$/.test(event.code)) {
    return event.code.slice(5);
  }
  return normalizePart(event.key);
}

export function isReservedKeyboardShortcut(shortcut: string): boolean {
  return RESERVED_SHORTCUTS.has(shortcut);
}

export function normalizeKeyboardShortcut(value: unknown, fallback = "Ctrl+Shift+K"): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const legacy = LEGACY_SHORTCUTS[value];
  if (legacy) {
    return isReservedKeyboardShortcut(legacy) ? fallback : legacy;
  }
  const parts = value
    .split("+")
    .map(normalizePart)
    .filter(Boolean);
  const key = parts.find((part) => !MODIFIER_KEYS.has(part));
  const modifiers = ["Ctrl", "Meta", "Alt", "Shift"].filter((part) => parts.includes(part));
  if (!key || modifiers.length === 0) {
    return fallback;
  }
  const shortcut = [...modifiers, key].join("+");
  return isReservedKeyboardShortcut(shortcut) ? fallback : shortcut;
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }

  const key = normalizeEventKey(event);
  const modifiers = [
    event.ctrlKey ? "Ctrl" : "",
    event.metaKey ? "Meta" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
  ].filter(Boolean);

  if (modifiers.length === 0) {
    return null;
  }

  return [...modifiers, key].join("+");
}

export function keyboardShortcutMatchesEvent(shortcut: string, event: KeyboardEvent): boolean {
  const normalized = normalizeKeyboardShortcut(shortcut);
  const eventShortcut = shortcutFromKeyboardEvent(event);
  return eventShortcut === normalized;
}
