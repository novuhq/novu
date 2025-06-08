import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from '../types';

export const welcomeTemplate: WorkflowTemplate = {
  id: 'welcome',
  name: 'Welcome',
  description: 'Welcome a user to your app',
  category: 'authentication',
  isPopular: true,
  workflowDefinition: {
    name: 'Welcome',
    description: 'Welcome a user to your app',
    workflowId: 'welcome',
    steps: [
      {
        name: 'In-App Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {
          body: "We're thrilled to have you on board! 🚀\n\n{{payload.app_name}} is designed to to make your life easier—and you’re now part of an amazing community.",
          avatar: 'https://dashboard-v2.novu.co/images/confetti.svg',
          subject: 'Welcome',
          redirect: {
            url: '',
            target: '_self',
          },
          disableOutputSanitization: false,
        },
      },
      {
        name: 'Delay Step',
        type: StepTypeEnum.DELAY,
        controlValues: {
          amount: 2,
          unit: 'hours',
          type: 'regular',
        },
      },
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          body: '{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Header%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/Acme%20Company%20Logo%20(Color).png?raw=true","alt":null,"title":null,"width":200,"height":41,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/welcome-v2%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":500,"height":200,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"heading","attrs":{"textAlign":"center","level":2,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Welcome to Acme!"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","text":"Hi "},{"type":"variable","attrs":{"id":"subscriber.firstName","label":null,"fallback":null,"required":true}},{"type":"text","text":", We\'re thrilled to have you on board! 🚀"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.app_name","label":null,"fallback":null,"required":true}},{"type":"text","text":" is designed to to make your life easier—and you’re now part of an amazing community."}]},{"type":"heading","attrs":{"textAlign":"left","level":3,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Here’s how to get started"}]},{"type":"orderedList","attrs":{"start":1},"content":[{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Complete your profile"},{"type":"text","text":" – Personalize your experience."}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Explore the features"},{"type":"text","text":" – Check out what’s possible."}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Join the community"},{"type":"text","text":" – Connect and collaborate."}]}]}]},{"type":"spacer","attrs":{"height":"lg","showIfKey":null}},{"type":"button","attrs":{"text":"Get Started Now","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#0abd9f","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32}},{"type":"paragraph","attrs":{"textAlign":"center","showIfKey":null},"content":[{"type":"text","text":"Questions? Contact us at "},{"type":"text","marks":[{"type":"link","attrs":{"href":"mailto:support@novu.co","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}},{"type":"bold"}],"text":"support@acme.com"}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Stay productive,"},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Acme Inc."}]},{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/yelp-footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.19938650306749,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"© 2025 | Acme Inc., 350 Mission Street, San Francisco, CA 94105, U.S.A. | "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://www.yelp.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}}],"text":"www.acme.com"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}}]},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Footer%20-%20Email%20Footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null}}]}',
          subject: 'Welcome to Acme – Let’s Get Started!',
        },
      },
    ],
    tags: [],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
