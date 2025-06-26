import { defineConfig, transformWithEsbuild } from "vite";
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

export default defineConfig({
  define: {
    process: process,
    global: "window",
    __DEV__: false,
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      resolveExtensions: extensions,
      jsx: "automatic",
      loader: {
        ".js": "jsx",
      },
    },
  },
  plugins: [
    {
      name: "treat-js-files-as-jsx",
      async transform(code: any, id: any) {
        if (!id.match(/node_modules\/.*\.js$/)) return null;
        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
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
    extensions,
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
    port: 8050,
    strictPort: true,
		host: "0.0.0.0",
  },
  // 3. to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    chunkSizeWarningLimit: 700,
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
