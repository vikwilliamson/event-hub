import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const SERVER_ONLY_PATTERNS = [
  "src/lib/actions/**",
  "src/lib/firebase/admin.ts",
  "src/lib/firebase/auth.server.ts",
  "src/lib/firebase/rsvp-db.ts",
  "src/lib/firebase/db.ts",
  "src/lib/firebase/public-db.ts",
  "src/lib/email/**",
  "src/app/api/**",
];

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Underscore prefix marks intentionally unused params (e.g. advisory
    // organizerId args kept for signature compatibility with the old API).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Prevent client components from importing server-only Firebase modules.
    // Server actions, API routes, and firebase lib files are excluded below.
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    ignores: SERVER_ONLY_PATTERNS,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/firebase/admin", "*/firebase/admin.ts"],
              message:
                "Firebase Admin SDK must not be imported from client components or hooks. Use a Server Action instead.",
            },
            {
              group: ["*/firebase/auth.server", "*/firebase/auth.server.ts"],
              message:
                "auth.server.ts is server-only. Use a Server Action to access session data.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
