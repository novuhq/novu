const codeTheme = require('./src/utils/prism');

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(
  module.exports = {
    title: 'Novu',
    tagline: 'All the tools you need to build modern transactional notification experience',
    url: 'https://docs.novu.co',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon.ico',
    organizationName: 'novuhq', // Usually your GitHub org/user name.
    projectName: 'novu', // Usually your repo name.
    plugins: ['docusaurus-plugin-sass'],
    presets: [
      [
        '@docusaurus/preset-classic',
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          docs: {
            sidebarCollapsed: false,
            sidebarPath: require.resolve('./sidebars.js'),
            // Please change this to your repo.
            editUrl: 'https://github.com/novuhq/novu/blob/main/docs/',
            breadcrumbs: false,
            routeBasePath: '/',
            showLastUpdateAuthor: true,
            showLastUpdateTime: true,
          },
          gtag: {
            trackingID: 'G-ZC17SLMXRN',
            anonymizeIP: true,
          },
          theme: {
            customCss: require.resolve('./src/css/custom.scss'),
          },
        }),
      ],
    ],

    themeConfig:
      /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({
        metadata: [
          { name: 'robots', content: 'max-image-preview:large' },
          {
            name: 'keywords',
            content:
              'novu,novu documentation,novu docs,notification,notification infrastructure,open source,oss',
          },
        ],
        image: '/img/social-preview.jpg',
        algolia: {
          appId: '5AG4YK0YDV',
          apiKey: '67ce2424b44097b63a6f21a6615de538',
          indexName: 'novu',
          contextualSearch: true,
          externalUrlRegex: 'https://docs.novu.co/api/.*',
        },
        docs: {
          sidebar: {
            autoCollapseCategories: false,
          },
        },
        colorMode: {
          respectPrefersColorScheme: true,
        },
        navbar: {
          logo: {
            alt: 'Novu Logo',
            src: 'img/logo-light-bg.svg',
            srcDark: 'img/logo-dark-bg.svg',
            href: '/',
            target: '_self',
            width: 114,
            height: 32,
          },
          items: [
            {
              type: 'search',
              position: 'left',
            },
            {
              href: 'https://docs.novu.co/api',
              label: 'API Reference',
              position: 'right',
            },
            {
              href: 'https://github.com/novuhq/novu',
              label: 'GitHub',
              position: 'right',
            },
            {
              href: 'https://discord.novu.co',
              label: 'Community',
              position: 'right',
            },
          ],
        },
        footer: {
          style: 'dark',
          logo: {
            alt: 'Novu',
            src: 'img/logo-light-bg.svg',
            srcDark: 'img/logo-dark-bg.svg',
            href: '/',
            width: 114,
            height: 32,
          },
          links: [
            {
              items: [
                {
                  label: 'Documentation',
                  to: '/',
                },
                {
                  label: 'Providers',
                  href: 'https://github.com/novuhq/novu/tree/main/providers',
                },
                {
                  label: 'Contact Us',
                  href: 'https://discord.novu.co',
                },
              ],
            },
            {
              items: [
                {
                  label: 'Discord',
                  href: 'https://discord.novu.co',
                },
                {
                  label: 'Twitter',
                  href: 'https://twitter.com/novuhq',
                },
                {
                  label: 'GitHub',
                  href: 'https://github.com/novuhq/novu',
                },
              ],
            },
          ],
          copyright: `© ${new Date().getFullYear()} Novu`,
        },
        tableOfContents: {
          minHeadingLevel: 2,
          maxHeadingLevel: 2,
        },
        prism: {
          theme: codeTheme,
          additionalLanguages: ['php', 'ruby', 'java'],
        },
      }),
  }
);
