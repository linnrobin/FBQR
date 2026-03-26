/** @type {import("eslint").Linter.Config} */
const config = {
  extends: [
    "next/core-web-vitals",
    "next/typescript",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["@typescript-eslint"],
  rules: {
    // Enforce explicit return types on public functions
    "@typescript-eslint/explicit-function-return-type": "off",
    // Disallow any usage
    "@typescript-eslint/no-explicit-any": "warn",
    // Require handling Promise rejections
    "@typescript-eslint/no-floating-promises": "error",
    // Disallow unused variables
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    // Enforce consistent imports
    "import/order": "off",
  },
};

module.exports = config;
