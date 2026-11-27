import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "development") {
    const localEnvironment = loadEnv(mode, process.cwd(), "");
    for (const [key, value] of Object.entries(localEnvironment)) {
      if (!key.startsWith("VITE_") && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  return {
    plugins: [
      tanstackStart({
        start: { entry: "start.js" },
        server: { entry: "server.js" },
        router: {
          entry: "router.jsx",
          generatedRouteTree: "routeTree.gen.ts",
          addExtensions: ".jsx",
        },
      }),
      nitro({ serverDir: "server" }),
      viteReact(),
      tailwindcss(),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
