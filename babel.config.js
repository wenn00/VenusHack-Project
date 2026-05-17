module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated v4 does not require its own babel plugin.
    // (Worklets are handled by the react-native-worklets package.)
  };
};
