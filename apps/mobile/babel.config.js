module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 moved its Babel plugin into react-native-worklets. The old
    // "react-native-reanimated/plugin" name is from v3; with v4 + worklets it
    // sets up the worklets runtime incorrectly, which crashed at app launch the
    // moment reanimated was first imported (via the draggable list). Must stay
    // last in the plugins list.
    plugins: ["react-native-worklets/plugin"],
  };
};
