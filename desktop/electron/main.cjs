const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const isSmoke = process.env.SMARTPAD_ELECTRON_SMOKE === "1";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 920,
    minHeight: 640,
    title: "SmartPad",
    backgroundColor: "#222450",
    show: !isSmoke,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.once("did-finish-load", () => {
    if (isSmoke) {
      const title = mainWindow.webContents.getTitle();
      console.log(`SmartPad Electron smoke loaded: ${title}`);
      app.quit();
    }
  });

  mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
