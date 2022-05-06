const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(
  module.exports = {
    title: 'Novu',
    tagline: 'All the tools you need to build modern transactional notification experience',
    url: 'https://novu.co',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/favicon-gradient.png',
    organizationName: 'novuhq', // Usually your GitHub org/user name.
    projectName: 'novu', // Usually your repo name.

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
          },
          theme: {
            customCss: require.resolve('./src/css/custom.css'),
          },
        }),
      ],
    ],

    themeConfig:
      /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({
        colorMode: {
          respectPrefersColorScheme: true,
        },
        navbar: {
          logo: {
            alt: 'Novu Logo',
            src: 'img/logo-formerly-light-bg.svg',
            srcDark: 'img/logo-formerly-dark-bg.svg',
            width: 100,
            height: 100,
          },
          items: [
            {
              type: 'doc',
              docId: 'overview/introduction',
              position: 'left',
              label: 'Documentation',
            },
            {
              href: 'https://discord.gg/9wcGSf22PM',
              className: 'navbar-item-discord',
              position: 'right',
            },
            {
              href: 'https://github.com/novuhq/novu',
              className: 'navbar-item-github',
              position: 'right',
            },
          ],
        },
        footer: {
          links: [
            {
              items: [
                {
                  label: 'Documentation',
                  to: '/docs/overview/introduction',
                },
                {
                  label: 'Providers',
                  href: 'https://github.com/novuhq/novu/tree/main/providers',
                },
                {
                  label: 'Contact Us',
                  href: 'https://discord.gg/9wcGSf22PM',
                },
              ],
            },
            {
              items: [
                {
                  label: 'Discord',
                  href: 'https://discord.gg/9wcGSf22PM',
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
          copyright: `Copyright © ${new Date().getFullYear()} Novu.`,
        },
        prism: {
          theme: lightCodeTheme,
          darkTheme: darkCodeTheme,
        },
      }),
  }
);
