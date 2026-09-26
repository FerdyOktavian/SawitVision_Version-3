import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();

  if (mode === "production") {
    if (!apiBaseUrl) {
      throw new Error(
        "VITE_API_BASE_URL wajib diisi untuk production build.",
      );
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(apiBaseUrl);
    } catch {
      throw new Error(
        "VITE_API_BASE_URL harus berupa URL HTTPS yang valid.",
      );
    }
    if (parsedUrl.protocol !== "https:") {
      throw new Error(
        "VITE_API_BASE_URL production harus menggunakan HTTPS.",
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: ["ancient-drivable-cupping.ngrok-free.dev"],
      proxy: {
        "/predict": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
