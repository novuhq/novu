import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '858'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '656'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '7d1'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', 'a24'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/chat/',
        component: ComponentCreator('/channels/chat/', '2ff'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/chat/discord',
        component: ComponentCreator('/channels/chat/discord', '937'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/chat/msteams',
        component: ComponentCreator('/channels/chat/msteams', '91f'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/chat/slack',
        component: ComponentCreator('/channels/chat/slack', '69b'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/',
        component: ComponentCreator('/channels/email/', '1e2'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/custom-smtp',
        component: ComponentCreator('/channels/email/custom-smtp', '78c'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/infobip',
        component: ComponentCreator('/channels/email/infobip', '1e4'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/mailersend',
        component: ComponentCreator('/channels/email/mailersend', 'af5'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/mailgun',
        component: ComponentCreator('/channels/email/mailgun', '9be'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/mailjet',
        component: ComponentCreator('/channels/email/mailjet', '818'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/mandrill',
        component: ComponentCreator('/channels/email/mandrill', 'cc9'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/netcore',
        component: ComponentCreator('/channels/email/netcore', 'cce'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/outlook365',
        component: ComponentCreator('/channels/email/outlook365', '765'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/plunk',
        component: ComponentCreator('/channels/email/plunk', '813'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/postmark',
        component: ComponentCreator('/channels/email/postmark', '3d8'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/resend',
        component: ComponentCreator('/channels/email/resend', '063'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/sendgrid',
        component: ComponentCreator('/channels/email/sendgrid', 'd4e'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/sendinblue',
        component: ComponentCreator('/channels/email/sendinblue', '136'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/ses',
        component: ComponentCreator('/channels/email/ses', 'd70'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/email/sparkpost',
        component: ComponentCreator('/channels/email/sparkpost', 'ee6'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/notification-center',
        component: ComponentCreator('/channels/notification-center', 'e62'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/push/',
        component: ComponentCreator('/channels/push/', '668'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/push/apns',
        component: ComponentCreator('/channels/push/apns', 'eb8'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/push/expo',
        component: ComponentCreator('/channels/push/expo', 'b7b'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/push/fcm',
        component: ComponentCreator('/channels/push/fcm', '5b8'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/push/one-signal',
        component: ComponentCreator('/channels/push/one-signal', '9ad'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/push/webhook',
        component: ComponentCreator('/channels/push/webhook', 'f90'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/',
        component: ComponentCreator('/channels/sms/', '29f'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/africas-talking',
        component: ComponentCreator('/channels/sms/africas-talking', '070'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/infobip',
        component: ComponentCreator('/channels/sms/infobip', 'c6a'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/nexmo',
        component: ComponentCreator('/channels/sms/nexmo', '3c8'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/plivo',
        component: ComponentCreator('/channels/sms/plivo', '666'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/sendchamp',
        component: ComponentCreator('/channels/sms/sendchamp', 'f27'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/SMS77',
        component: ComponentCreator('/channels/sms/SMS77', '73f'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/sns',
        component: ComponentCreator('/channels/sms/sns', '33f'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/telnyx',
        component: ComponentCreator('/channels/sms/telnyx', '381'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/termii',
        component: ComponentCreator('/channels/sms/termii', '1d1'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/channels/sms/twilio',
        component: ComponentCreator('/channels/sms/twilio', 'bc5'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/community/code-conduct',
        component: ComponentCreator('/community/code-conduct', 'daf'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/community/create-provider',
        component: ComponentCreator('/community/create-provider', 'c0b'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/community/faq',
        component: ComponentCreator('/community/faq', '0c1'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/community/monorepo-structure',
        component: ComponentCreator('/community/monorepo-structure', '7c9'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/community/projects-and-articles',
        component: ComponentCreator('/community/projects-and-articles', '460'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/community/run-locally',
        component: ComponentCreator('/community/run-locally', '86b'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/cookbook/introduction',
        component: ComponentCreator('/cookbook/introduction', '0bf'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/guides/how-to-add-digest-to-email-notifications',
        component: ComponentCreator('/guides/how-to-add-digest-to-email-notifications', '42c'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/guides/how-to-add-digest-to-in-app-notifications',
        component: ComponentCreator('/guides/how-to-add-digest-to-in-app-notifications', '0fe'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/guides/subscribers-migration',
        component: ComponentCreator('/guides/subscribers-migration', '7d8'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/angular-component',
        component: ComponentCreator('/notification-center/angular-component', 'd7c'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/custom-styling',
        component: ComponentCreator('/notification-center/custom-styling', 'c73'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/FAQ',
        component: ComponentCreator('/notification-center/FAQ', 'dca'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/getting-started',
        component: ComponentCreator('/notification-center/getting-started', '51e'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/headless/api-reference',
        component: ComponentCreator('/notification-center/headless/api-reference', 'edf'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/headless/headless-service',
        component: ComponentCreator('/notification-center/headless/headless-service', '7dd'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/iframe-embed',
        component: ComponentCreator('/notification-center/iframe-embed', '4f7'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/react/api-reference',
        component: ComponentCreator('/notification-center/react/api-reference', '6f6'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/react/react-components',
        component: ComponentCreator('/notification-center/react/react-components', '68a'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/vue-component',
        component: ComponentCreator('/notification-center/vue-component', '78e'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/notification-center/web-component',
        component: ComponentCreator('/notification-center/web-component', '6da'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/architecture',
        component: ComponentCreator('/overview/architecture', '319'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/docker-deploy',
        component: ComponentCreator('/overview/docker-deploy', 'f23'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/introduction',
        component: ComponentCreator('/overview/introduction', '103'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/general-quickstart',
        component: ComponentCreator('/overview/quickstart/general-quickstart', '735'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-angular',
        component: ComponentCreator('/overview/quickstart/get-started-with-angular', 'eb6'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-dotnet',
        component: ComponentCreator('/overview/quickstart/get-started-with-dotnet', 'a23'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-go',
        component: ComponentCreator('/overview/quickstart/get-started-with-go', '067'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-java',
        component: ComponentCreator('/overview/quickstart/get-started-with-java', '2ca'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-kotlin',
        component: ComponentCreator('/overview/quickstart/get-started-with-kotlin', 'e7f'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-nestjs',
        component: ComponentCreator('/overview/quickstart/get-started-with-nestjs', '165'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-nextjs',
        component: ComponentCreator('/overview/quickstart/get-started-with-nextjs', 'a9d'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-node.js',
        component: ComponentCreator('/overview/quickstart/get-started-with-node.js', '913'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-php',
        component: ComponentCreator('/overview/quickstart/get-started-with-php', '94d'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-python',
        component: ComponentCreator('/overview/quickstart/get-started-with-python', '7d7'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-react',
        component: ComponentCreator('/overview/quickstart/get-started-with-react', 'b28'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-ruby',
        component: ComponentCreator('/overview/quickstart/get-started-with-ruby', '037'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-vanilla-js',
        component: ComponentCreator('/overview/quickstart/get-started-with-vanilla-js', 'ef4'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/overview/quickstart/get-started-with-vue',
        component: ComponentCreator('/overview/quickstart/get-started-with-vue', '935'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/activity-feed',
        component: ComponentCreator('/platform/activity-feed', '1dc'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/delay',
        component: ComponentCreator('/platform/delay', 'a45'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/digest',
        component: ComponentCreator('/platform/digest', '192'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/environments',
        component: ComponentCreator('/platform/environments', 'fc0'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/handlebars',
        component: ComponentCreator('/platform/handlebars', '4cf'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/inbound-parse-webhook',
        component: ComponentCreator('/platform/inbound-parse-webhook', 'da0'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/integrations',
        component: ComponentCreator('/platform/integrations', '601'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/layouts',
        component: ComponentCreator('/platform/layouts', '1e9'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/messages',
        component: ComponentCreator('/platform/messages', '1f7'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/preferences',
        component: ComponentCreator('/platform/preferences', '4cc'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/step-filter',
        component: ComponentCreator('/platform/step-filter', '6b6'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/subscribers',
        component: ComponentCreator('/platform/subscribers', 'f0a'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/topics',
        component: ComponentCreator('/platform/topics', 'af5'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/webhooks',
        component: ComponentCreator('/platform/webhooks', '730'),
        exact: true,
        sidebar: "tutorialSidebar"
      },
      {
        path: '/platform/workflows',
        component: ComponentCreator('/platform/workflows', '448'),
        exact: true,
        sidebar: "tutorialSidebar"
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
