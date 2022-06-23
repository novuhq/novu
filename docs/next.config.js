module.exports = {
  async redirects() {
    return [
      {
        source: '/docs/:slug*',
        destination: '/:slug*', // Matched parameters can be used in the destination
        permanent: true,
      },
    ];
  },
};
