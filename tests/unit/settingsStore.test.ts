import { createSettingsState, DEFAULT_SETTINGS, settingsReducer } from "../../src/state/settingsStore";

describe("settings store reference export mode", () => {
  const storageKey = "smartpad-settings";

  beforeEach(() => {
    localStorage.clear();
  });

  test("defaults include reference export mode", () => {
    expect("chipInsertMode" in DEFAULT_SETTINGS).toBe(false);
    expect(DEFAULT_SETTINGS.referenceTextExportMode).toBe("preserve");
  });

  test("createSettingsState backfills new settings and removes retired chip insert mode", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        decimalPlaces: 4,
        liveResultEnabled: false,
        chipInsertMode: "value",
      })
    );

    const settings = createSettingsState();
    expect(settings.decimalPlaces).toBe(4);
    expect(settings.liveResultEnabled).toBe(false);
    expect("chipInsertMode" in settings).toBe(false);
    expect(settings.referenceTextExportMode).toBe("preserve");
  });

  test("settingsReducer updates reference export mode", () => {
    const withReadableExport = settingsReducer(DEFAULT_SETTINGS, {
      type: "UPDATE_SETTING",
      payload: { key: "referenceTextExportMode", value: "readable" },
    });
    expect(withReadableExport.referenceTextExportMode).toBe("readable");
  });
});
