#!/usr/bin/env node

const { spawn, exec } = require("child_process");

const DEV_PORT = 3200;

function checkDevPort() {
  return new Promise((resolve) => {
    exec(`lsof -ti:${DEV_PORT}`, (error, stdout) => {
      resolve(stdout.trim() !== ""); // Returns true if port is in use
    });
  });
}

async function startDevServer() {
  const portInUse = await checkDevPort();

  if (portInUse) {
    console.error(
      `The Vite dev server is already up and running at ${DEV_PORT}, no need to run dev server! (if you want to re-run it anyway, kill the process running on port ${DEV_PORT} and run "npm run dev" again)\n\n`
    );
    process.exit(1);
  }

  
  // Start Vite dev server
  const vite = spawn("npx", ["vite"], {
    stdio: "inherit",
    shell: true,
  });

  vite.on("close", (code) => {
    process.exit(code);
  });

  vite.on("error", (err) => {
    console.error("Failed to start dev server:", err);
    process.exit(1);
  });
}

startDevServer();
