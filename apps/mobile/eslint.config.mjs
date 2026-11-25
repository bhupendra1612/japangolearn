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
      // SDK 56+ uses Expo Router's own navigation context. Mixing in the
      // standalone React Navigation hooks crashes otherwise valid screens.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@react-navigation/*"],
              message:
                "Use expo-router or its navigator entry points (for example expo-router/js-tabs) so hooks share the app's navigation context.",
            },
          ],
        },
      ],
    },
  },
];
