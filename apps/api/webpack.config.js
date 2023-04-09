module.exports = function (options) {
  options.externals.push({
    '@taskforcesh/bullmq-pro': '@taskforcesh/bullmq-pro',
  });

  return {
    ...options,
    devtool: 'source-map',
  };
};
