import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Pull in everything from Next.js’s “core-web-vitals” + TS presets
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Then override any specific rules:
  {
    rules: {
      // Turn off “no-unused-vars” entirely
      "@typescript-eslint/no-unused-vars": "off",

      // Turn off the “ban-types” rule (which forbade `{}` in your code)
      "@typescript-eslint/ban-types": "off",
    },
  },
];

export default eslintConfig;
