import { createSettingsState, DEFAULT_SETTINGS, settingsReducer } from "../../src/state/settingsStore";

describe("settings store reference export mode", () => {
  const storageKey = "smartpad-settings";

  beforeEach(() => {
    localStorage.clear();
  });

  test("defaults include reference export mode", () => {
    expect("chipInsertMode" in DEFAULT_SETTINGS).toBe(false);
    expect(DEFAULT_SETTINGS.referenceTextExportMode).toBe("preserve");
    expect(DEFAULT_SETTINGS.autocompleteManualShortcut).toBe("ctrl-space");
  });

  test("createSettingsState backfills new settings, normalizes autocomplete shortcut, and removes retired chip insert mode", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        decimalPlaces: 4,
        liveResultEnabled: false,
        chipInsertMode: "value",
        autocompleteManualShortcut: "bad-shortcut",
      })
    );

    const settings = createSettingsState();
    expect(settings.decimalPlaces).toBe(4);
    expect(settings.liveResultEnabled).toBe(false);
    expect("chipInsertMode" in settings).toBe(false);
    expect(settings.referenceTextExportMode).toBe("preserve");
    expect(settings.autocompleteManualShortcut).toBe("ctrl-space");
  });

  test("settingsReducer updates reference export mode", () => {
    const withReadableExport = settingsReducer(DEFAULT_SETTINGS, {
      type: "UPDATE_SETTING",
      payload: { key: "referenceTextExportMode", value: "readable" },
    });
    expect(withReadableExport.referenceTextExportMode).toBe("readable");
  });

  test("settingsReducer updates autocomplete shortcut", () => {
    const withShortcut = settingsReducer(DEFAULT_SETTINGS, {
      type: "UPDATE_SETTING",
      payload: { key: "autocompleteManualShortcut", value: "alt-slash" },
    });
    expect(withShortcut.autocompleteManualShortcut).toBe("alt-slash");
  });
});
