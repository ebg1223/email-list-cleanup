import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
// import devtools from 'solid-devtools/vite';
import { viteSingleFile } from "vite-plugin-singlefile";
export default defineConfig(({ mode }) => ({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    mode === "singlefile" ? viteSingleFile() : null,
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    outDir: mode === "singlefile" ? "singlefile" : "dist",
  },
}));
