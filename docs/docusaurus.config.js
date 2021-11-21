const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(
  module.exports = {
    title: "Notifire",
    tagline:
      "All the tools you need to build modern transactional notification experience",
    url: "https://notifire.co",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "notifirehq", // Usually your GitHub org/user name.
    projectName: "notifire", // Usually your repo name.

    presets: [
      [
        "@docusaurus/preset-classic",
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          docs: {
            sidebarPath: require.resolve("./sidebars.js"),
            // Please change this to your repo.
            editUrl: "https://github.com/notifirehq/notifire/blob/master/docs/",
          },
          theme: {
            customCss: require.resolve("./src/css/custom.css"),
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
          title: "Notifire",
          logo: {
            alt: "Notifire Logo",
            src: "img/logo.svg",
          },
          items: [
            {
              type: "doc",
              docId: "overview/introduction",
              position: "left",
              label: "Documentation",
            },
            {
              href: "https://discord.gg/9wcGSf22PM",
              className: "navbar-item-discord",
              position: "right",
            },
            {
              href: "https://github.com/notifirehq/notifire",
              className: "navbar-item-github",
              position: "right",
            },
          ],
        },
        footer: {
          style: "dark",
          links: [
            {
              title: "Documentation",
              items: [
                {
                  label: "Documentation",
                  to: "/docs/overview/introduction",
                },
              ],
            },
            {
              title: "Community",
              items: [
                {
                  label: "GitHub",
                  href: "https://github.com/notifirehq/notifire",
                },
                {
                  label: "Discord",
                  href: "https://discord.gg/9wcGSf22PM",
                },
              ],
            },
            {
              title: "More",
              items: [
                {
                  label: "GitHub",
                  href: "https://github.com/notifirehq/notifire",
                },
              ],
            },
          ],
          copyright: `Copyright © ${new Date().getFullYear()} Notifire.`,
        },
        prism: {
          theme: lightCodeTheme,
          darkTheme: darkCodeTheme,
        },
      }),
  }
);
