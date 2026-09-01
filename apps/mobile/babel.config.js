module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // This is the Reanimated 3 plugin name and it is technically wrong for the
    // installed Reanimated 4 — but it is a no-op while nothing imports
    // reanimated, and this is the exact config the app has always launched with
    // in Expo Go. When a reanimated feature ships it must be built as a dev
    // build (Expo Go cannot run Reanimated 4's worklets), and this changes to
    // "react-native-worklets/plugin".
    plugins: ["react-native-reanimated/plugin"],
  };
};
