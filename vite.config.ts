import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
const extensions = [
  ".web.tsx",
  ".tsx",
  ".web.ts",
  ".ts",
  ".web.jsx",
  ".jsx",
  ".web.js",
  ".js",
  ".css",
  ".json",
];

export default defineConfig(async () => ({
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          "react-native-web",
          [
            "babel-plugin-inline-import",
            {
              extensions: [".svg"],
            },
          ],
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "react-native": "react-native-web",
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },
  // 3. to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
}));
