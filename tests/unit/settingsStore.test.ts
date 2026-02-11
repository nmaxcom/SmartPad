import { createSettingsState, DEFAULT_SETTINGS, settingsReducer } from "../../src/state/settingsStore";

describe("settings store reference modes", () => {
  const storageKey = "smartpad-settings";

  beforeEach(() => {
    localStorage.clear();
  });

  test("defaults include chip insert and reference export modes", () => {
    expect(DEFAULT_SETTINGS.chipInsertMode).toBe("reference");
    expect(DEFAULT_SETTINGS.referenceTextExportMode).toBe("preserve");
  });

  test("createSettingsState backfills new settings when older payload is loaded", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        decimalPlaces: 4,
        liveResultEnabled: false,
      })
    );

    const settings = createSettingsState();
    expect(settings.decimalPlaces).toBe(4);
    expect(settings.liveResultEnabled).toBe(false);
    expect(settings.chipInsertMode).toBe("reference");
    expect(settings.referenceTextExportMode).toBe("preserve");
  });

  test("settingsReducer updates new mode settings", () => {
    const withValueInsert = settingsReducer(DEFAULT_SETTINGS, {
      type: "UPDATE_SETTING",
      payload: { key: "chipInsertMode", value: "value" },
    });
    expect(withValueInsert.chipInsertMode).toBe("value");

    const withReadableExport = settingsReducer(withValueInsert, {
      type: "UPDATE_SETTING",
      payload: { key: "referenceTextExportMode", value: "readable" },
    });
    expect(withReadableExport.referenceTextExportMode).toBe("readable");
  });
});
