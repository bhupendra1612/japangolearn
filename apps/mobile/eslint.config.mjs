import expoConfig from "eslint-config-expo/flat.js";

export default [
  {
    ignores: [
      ".expo/**",
      "android/**",
      "ios/**",
      "node_modules/**",
      "web-build/**",
      "expo-env.d.ts",
    ],
  },
  ...expoConfig,
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
];
