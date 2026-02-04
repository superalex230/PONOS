import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { startServer } from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0e0f14",
    webPreferences: {
      contextIsolation: true,
    },
  });

  mainWindow.loadURL("http://localhost:3000");
}

app.whenReady().then(() => {
  startServer(3000);
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
