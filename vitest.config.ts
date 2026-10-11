import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

// Allow the gateway's NodeNext-style `.js` import specifiers to resolve to `.ts` sources
// under Vitest (esbuild/Vite otherwise look for a literal `.js` file).
function jsToTs(): Plugin {
  return {
    name: "js-to-ts-resolver",
    enforce: "pre",
    async resolveId(source, importer) {
      if (source.startsWith(".") && source.endsWith(".js") && importer) {
        const ts = source.replace(/\.js$/, ".ts");
        const resolved = await this.resolve(ts, importer, { skipSelf: true });
        if (resolved) return resolved;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), jsToTs()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
