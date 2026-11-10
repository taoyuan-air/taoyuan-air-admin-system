import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (command === 'build') {
    if (!['true', 'false'].includes(env.VITE_DEMO_MODE)) throw new Error('Set VITE_DEMO_MODE explicitly');
    if (env.VITE_DEMO_MODE === 'false' && !env.VITE_API_BASE_URL?.trim()) {
      throw new Error('Set VITE_API_BASE_URL to an HTTPS backend or / for an explicitly configured same-origin proxy');
    }
    if (env.VITE_DEMO_MODE === 'false' && env.VITE_API_BASE_URL.trim() !== '/') {
      let url: URL;
      try {
        url = new URL(env.VITE_API_BASE_URL.trim());
      } catch {
        throw new Error('Production API must be a valid HTTPS URL');
      }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
        throw new Error('Production API must be an HTTPS URL without credentials, query or fragment');
      }
    }
    if (Object.keys(env).some(key => /^VITE_MOCK_.*_PASSWORD$/.test(key) && env[key])) {
      throw new Error('Remove VITE_MOCK_*_PASSWORD: browser settings are public');
    }
  }
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
