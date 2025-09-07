import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      // Erlaubt unescaped Entities wie Anführungszeichen
      "react/no-unescaped-entities": "off",

      // Verhindert, dass "any"-Fehler den Build blockieren
      "@typescript-eslint/no-explicit-any": "off",

      // Unused vars nur als Warnung und ignoriert Variablen die mit "_" beginnen
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // React Hooks Dependency Warnungen nur als Warnung
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
