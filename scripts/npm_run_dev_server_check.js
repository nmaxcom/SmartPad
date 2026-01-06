#!/usr/bin/env node

const { spawn, exec } = require("child_process");

function checkPort3000() {
  return new Promise((resolve) => {
    exec("lsof -ti:3000", (error, stdout) => {
      resolve(stdout.trim() !== ""); // Returns true if port is in use
    });
  });
}

async function startDevServer() {
  const portInUse = await checkPort3000();

  if (portInUse) {
    console.error(
      'The Vite dev server is already up and running at 3000, no need to run dev server! (if you want to re-run it anyway, kill the process running on port 3000 and run "npm run dev" again)\n\n'
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
