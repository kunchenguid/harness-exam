// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig(
  eslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
  },
  {
    ignores: [
      "node_modules/",
      "src/tasks/task-3-incident-dashboard/htmx.min.js",
    ],
  },
);
