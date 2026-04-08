// electron/main.js
if (require("electron-squirrel-startup")) {
  process.exit(0);
}

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { fork } = require("child_process");
const http = require("http");
const fs = require("fs");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

let backendProcess = null;
let backendStarted = false;

function waitForHealth(url, timeoutMs = 25000, intervalMs = 400) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on("error", retry);

      function retry() {
        if (Date.now() - start > timeoutMs) return reject(new Error("Health timeout"));
        setTimeout(tick, intervalMs);
      }
    };
    tick();
  });
}

const iconPath = path.join(__dirname, "LOGO.ico");

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    icon: iconPath,
  });

  // Uncomment for debugging:
  // win.webContents.openDevTools();

  win.loadURL(`http://127.0.0.1:${port}`);

  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
  });
}

function startBackend() {
  const port = process.env.PORT || "3001";

  if (backendStarted) return { port };
  backendStarted = true;

  const isPackaged = app.isPackaged;

  let backendDir;
  if (isPackaged) {
    backendDir = path.join(process.resourcesPath, "backend");
  } else {
    backendDir = path.join(__dirname, "..", "backend");
  }

  const frontendDist = isPackaged
    ? path.join(process.resourcesPath, "frontend_dist")
    : path.join(__dirname, "..", "frontend", "dist");

  const serverJs = path.join(backendDir, "src", "index.js");

  const logFile = path.join(app.getPath("userData"), "backend.log");
  fs.appendFileSync(logFile, `\n[Electron] startBackend() called at ${new Date().toISOString()}\n`);
  fs.appendFileSync(logFile, `[Electron] isPackaged=${isPackaged}\n`);
  fs.appendFileSync(logFile, `[Electron] backendDir=${backendDir}\n`);
  fs.appendFileSync(logFile, `[Electron] serverJs=${serverJs}\n`);
  fs.appendFileSync(logFile, `[Electron] frontendDist=${frontendDist}\n`);

  const out = fs.openSync(logFile, "a");
  const err = fs.openSync(logFile, "a");

  backendProcess = fork(serverJs, [], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(port),
      FRONTEND_DIST: frontendDist,
    },
    stdio: ["ignore", out, err, "ipc"],
    windowsHide: true,
  });

  backendProcess.on("error", (e) => {
    try {
      fs.appendFileSync(logFile, `\n[Electron] spawn error: ${e.message}\n`);
    } catch {}
  });

  backendProcess.on("exit", (code) => {
    try {
      fs.appendFileSync(logFile, `\n[Electron] Backend exited with code: ${code}\n`);
    } catch {}
  });

  return { port };
}

app.whenReady().then(async () => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.tesdantc.registration");
  }

  const { port } = startBackend();

  try {
    await waitForHealth(`http://127.0.0.1:${port}/api/health`, 25000);
  } catch (e) {
    console.error(e);
  }

  createWindow(port);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});