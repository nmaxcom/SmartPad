import {
  keyboardShortcutMatchesEvent,
  normalizeKeyboardShortcut,
  shortcutFromKeyboardEvent,
} from "../../src/utils/keyboardShortcut";

const keyboardEvent = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent("keydown", init);

describe("keyboard shortcut helpers", () => {
  test("normalizes recorded shortcuts and legacy preset values", () => {
    expect(normalizeKeyboardShortcut("ctrl-space")).toBe("Ctrl+Shift+K");
    expect(normalizeKeyboardShortcut("cmd-space")).toBe("Ctrl+Shift+K");
    expect(normalizeKeyboardShortcut("Alt+/")).toBe("Alt+/");
    expect(normalizeKeyboardShortcut("shift+ctrl+k")).toBe("Ctrl+Shift+K");
  });

  test("rejects shortcuts without a modifier", () => {
    expect(normalizeKeyboardShortcut("K")).toBe("Ctrl+Shift+K");
    expect(shortcutFromKeyboardEvent(keyboardEvent({ key: "k", code: "KeyK" }))).toBeNull();
  });

  test("rejects system-reserved space shortcuts", () => {
    expect(normalizeKeyboardShortcut("Ctrl+Space")).toBe("Ctrl+Shift+K");
    expect(normalizeKeyboardShortcut("Meta+Space")).toBe("Ctrl+Shift+K");
  });

  test("records a keyboard event into a stable shortcut string", () => {
    expect(
      shortcutFromKeyboardEvent(
        keyboardEvent({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true })
      )
    ).toBe("Ctrl+Shift+K");
    expect(
      shortcutFromKeyboardEvent(keyboardEvent({ key: " ", code: "Space", metaKey: true }))
    ).toBe("Meta+Space");
  });

  test("matches shortcuts against keyboard events", () => {
    expect(
      keyboardShortcutMatchesEvent(
        "Ctrl+Shift+K",
        keyboardEvent({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true })
      )
    ).toBe(true);
    expect(
      keyboardShortcutMatchesEvent(
        "Ctrl+K",
        keyboardEvent({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true })
      )
    ).toBe(false);
  });
});
