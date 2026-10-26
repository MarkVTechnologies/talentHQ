// app.cjs
// Startup file for cPanel/DirectAdmin "Setup Node.js App" (Passenger / LiteSpeed lsnode).
// Those runners load the startup file with require(), which can't load ESM directly,
// so we load env vars here and then dynamically import the ESM entry point.
require("dotenv").config();
import("./index.js").catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
