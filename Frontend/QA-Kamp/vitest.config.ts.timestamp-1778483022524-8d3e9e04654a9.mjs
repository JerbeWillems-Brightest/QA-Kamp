// vitest.config.ts
import { defineConfig } from "file:///C:/Users/12101540/Desktop/I-Talent/Stage/QA-Kamp/Frontend/QA-Kamp/node_modules/vitest/dist/config.js";
var useC8 = String(process.env.C8 || process.env.USE_C8 || "").toLowerCase() === "true";
var vitest_config_default = defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    testTimeout: 1e4,
    setupFiles: ["src/setupTests.ts"],
    // when not using c8, enable vitest's internal coverage collection
    ...useC8 ? {} : {
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "html"],
        reportsDirectory: "coverage",
        all: true,
        include: ["src/**/*.{ts,tsx,js,jsx}"],
        // exclude test setup and any helpers that should not be part of coverage
        exclude: [
          // the config file itself
          "vitest.config.ts",
          "./vitest.config.ts",
          "**/vitest.config.ts",
          // setup files
          "src/setupTests.ts",
          "./src/setupTests.ts",
          "**/setupTests.*",
          "src/**/setupTests.*",
          // test directories
          "src/**/__tests__/**",
          "**/__tests__/**",
          // explicit patterns for spec/test files
          "src/**/*.spec.{ts,tsx,js,jsx}",
          "src/**/*.test.{ts,tsx,js,jsx}",
          "**/*.spec.{ts,tsx,js,jsx}",
          "**/*.test.{ts,tsx,js,jsx}",
          // fallback
          "src/**/?(*.)+(spec|test).{ts,tsx,js,jsx}"
        ]
      }
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDEyMTAxNTQwXFxcXERlc2t0b3BcXFxcSS1UYWxlbnRcXFxcU3RhZ2VcXFxcUUEtS2FtcFxcXFxGcm9udGVuZFxcXFxRQS1LYW1wXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwxMjEwMTU0MFxcXFxEZXNrdG9wXFxcXEktVGFsZW50XFxcXFN0YWdlXFxcXFFBLUthbXBcXFxcRnJvbnRlbmRcXFxcUUEtS2FtcFxcXFx2aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy8xMjEwMTU0MC9EZXNrdG9wL0ktVGFsZW50L1N0YWdlL1FBLUthbXAvRnJvbnRlbmQvUUEtS2FtcC92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZydcclxuXHJcbi8vIElmIHlvdSB3YW50IHRvIGNvbGxlY3QgY292ZXJhZ2Ugd2l0aCBleHRlcm5hbCBjOCwgc2V0IEM4PXRydWUgaW4gdGhlIGVudmlyb25tZW50LlxyXG4vLyBXaGVuIEM4PXRydWUgd2Ugb21pdCB2aXRlc3QncyBpbnRlcm5hbCBjb3ZlcmFnZSBjb25maWd1cmF0aW9uIHNvIGM4IGNhbiBpbnN0cnVtZW50XHJcbi8vIHRoZSBjb2RlIGFuZCBwcm9kdWNlIGNvdmVyYWdlIHJlcG9ydHMuIEV4YW1wbGUgKFBvd2VyU2hlbGwpOlxyXG4vLyAkZW52OkM4PSd0cnVlJzsgbnB4IGM4IC0tcmVwb3J0ZXI9dGV4dCAtLXJlcG9ydGVyPWxjb3YgLS0gbnBtIHJ1biB0ZXN0IC0tIC0tcnVuXHJcbmNvbnN0IHVzZUM4ID0gU3RyaW5nKHByb2Nlc3MuZW52LkM4IHx8IHByb2Nlc3MuZW52LlVTRV9DOCB8fCAnJykudG9Mb3dlckNhc2UoKSA9PT0gJ3RydWUnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHRlc3Q6IHtcclxuICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgIHRlc3RUaW1lb3V0OiAxMDAwMCxcclxuICAgIHNldHVwRmlsZXM6IFsnc3JjL3NldHVwVGVzdHMudHMnXSxcclxuICAgIC8vIHdoZW4gbm90IHVzaW5nIGM4LCBlbmFibGUgdml0ZXN0J3MgaW50ZXJuYWwgY292ZXJhZ2UgY29sbGVjdGlvblxyXG4gICAgLi4uKHVzZUM4ID8ge30gOiB7XHJcbiAgICAgIGNvdmVyYWdlOiB7XHJcbiAgICAgICAgcHJvdmlkZXI6ICd2OCcsXHJcbiAgICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdsY292JywgJ2h0bWwnXSxcclxuICAgICAgICByZXBvcnRzRGlyZWN0b3J5OiAnY292ZXJhZ2UnLFxyXG4gICAgICAgIGFsbDogdHJ1ZSxcclxuICAgICAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLnt0cyx0c3gsanMsanN4fSddLFxyXG4gICAgICAgIC8vIGV4Y2x1ZGUgdGVzdCBzZXR1cCBhbmQgYW55IGhlbHBlcnMgdGhhdCBzaG91bGQgbm90IGJlIHBhcnQgb2YgY292ZXJhZ2VcclxuICAgICAgICBleGNsdWRlOiBbXHJcbiAgICAgICAgICAvLyB0aGUgY29uZmlnIGZpbGUgaXRzZWxmXHJcbiAgICAgICAgICAndml0ZXN0LmNvbmZpZy50cycsXHJcbiAgICAgICAgICAnLi92aXRlc3QuY29uZmlnLnRzJyxcclxuICAgICAgICAgICcqKi92aXRlc3QuY29uZmlnLnRzJyxcclxuICAgICAgICAgIC8vIHNldHVwIGZpbGVzXHJcbiAgICAgICAgICAnc3JjL3NldHVwVGVzdHMudHMnLFxyXG4gICAgICAgICAgJy4vc3JjL3NldHVwVGVzdHMudHMnLFxyXG4gICAgICAgICAgJyoqL3NldHVwVGVzdHMuKicsXHJcbiAgICAgICAgICAnc3JjLyoqL3NldHVwVGVzdHMuKicsXHJcbiAgICAgICAgICAvLyB0ZXN0IGRpcmVjdG9yaWVzXHJcbiAgICAgICAgICAnc3JjLyoqL19fdGVzdHNfXy8qKicsXHJcbiAgICAgICAgICAnKiovX190ZXN0c19fLyoqJyxcclxuICAgICAgICAgIC8vIGV4cGxpY2l0IHBhdHRlcm5zIGZvciBzcGVjL3Rlc3QgZmlsZXNcclxuICAgICAgICAgICdzcmMvKiovKi5zcGVjLnt0cyx0c3gsanMsanN4fScsXHJcbiAgICAgICAgICAnc3JjLyoqLyoudGVzdC57dHMsdHN4LGpzLGpzeH0nLFxyXG4gICAgICAgICAgJyoqLyouc3BlYy57dHMsdHN4LGpzLGpzeH0nLFxyXG4gICAgICAgICAgJyoqLyoudGVzdC57dHMsdHN4LGpzLGpzeH0nLFxyXG4gICAgICAgICAgLy8gZmFsbGJhY2tcclxuICAgICAgICAgICdzcmMvKiovPygqLikrKHNwZWN8dGVzdCkue3RzLHRzeCxqcyxqc3h9JyxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgfSxcclxufSlcclxuXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlksU0FBUyxvQkFBb0I7QUFNeGEsSUFBTSxRQUFRLE9BQU8sUUFBUSxJQUFJLE1BQU0sUUFBUSxJQUFJLFVBQVUsRUFBRSxFQUFFLFlBQVksTUFBTTtBQUVuRixJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsbUJBQW1CO0FBQUE7QUFBQSxJQUVoQyxHQUFJLFFBQVEsQ0FBQyxJQUFJO0FBQUEsTUFDZixVQUFVO0FBQUEsUUFDUixVQUFVO0FBQUEsUUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxRQUNqQyxrQkFBa0I7QUFBQSxRQUNsQixLQUFLO0FBQUEsUUFDTCxTQUFTLENBQUMsMEJBQTBCO0FBQUE7QUFBQSxRQUVwQyxTQUFTO0FBQUE7QUFBQSxVQUVQO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQTtBQUFBLFVBRUE7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQTtBQUFBLFVBRUE7QUFBQSxVQUNBO0FBQUE7QUFBQSxVQUVBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUE7QUFBQSxVQUVBO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
