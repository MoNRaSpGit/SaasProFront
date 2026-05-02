import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as { version?: string };
const frontendVersion = packageJson.version || "0.1.0";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(frontendVersion),
    __APP_RELEASE_SHA__: JSON.stringify(process.env.VITE_RELEASE_SHA || process.env.RELEASE_SHA || "local"),
    __APP_RELEASE_CREATED_AT__: JSON.stringify(
      process.env.VITE_RELEASE_CREATED_AT || process.env.RELEASE_CREATED_AT || null
    )
  }
});
