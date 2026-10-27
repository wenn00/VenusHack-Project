// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions is Deno code, checked with `deno check` instead.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
