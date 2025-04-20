import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from '../types';

export const cardExpiringTemplate: WorkflowTemplate = {
  id: 'card-expiring',
  name: 'Card Expiring',
  description: "This email will be sent 1 month before a customer's card on file expires. ",
  category: 'billing',
  isPopular: false,
  workflowDefinition: {
    name: 'Card Expiring',
    description: "This email will be sent 1 month before a customer's card on file expires. ",
    workflowId: 'card-expiring',
    steps: [
      {
        name: 'In-App Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {
          body: 'Just a heads-up! Your Visa card ending in {{payload.lastFourDigits}} will expire at the end of the month.\n\nTo avoid any interruptions, please update your card details before it expires.',
          avatar: 'https://dashboard-v2.novu.co/images/info-2.svg',
          subject: 'Please update your payment information',
          primaryAction: {
            label: 'Update now',
            redirect: {
              target: '_self',
              url: '',
            },
          },
          redirect: {
            url: '{{payload.action_url}}',
            target: '_self',
          },
          disableOutputSanitization: false,
        },
      },
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          body: '{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Header%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/Acme%20Company%20Logo%20(Color).png?raw=true","alt":null,"title":null,"width":200,"height":41,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/card-expiring%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":500,"height":200,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"heading","attrs":{"textAlign":"center","level":2,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(48, 48, 48)"}},{"type":"bold"}],"text":"Update your card information"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","text":"Just a heads-up! "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":"Your Visa card ending in "},{"type":"variable","attrs":{"id":"payload.lastFourDigits","label":null,"fallback":null,"required":false},"marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":" will expire at the end of the month"},{"type":"text","text":". To avoid any interruptions, please update your card details with "},{"type":"variable","attrs":{"id":"payload.companyName","label":null,"fallback":null,"required":false}},{"type":"text","text":" before it expires."}]},{"type":"button","attrs":{"text":"Update now","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#0abd9f","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32}},{"type":"paragraph","attrs":{"textAlign":"center","showIfKey":null},"content":[{"type":"text","text":"Questions? Contact us at "},{"type":"text","marks":[{"type":"link","attrs":{"href":"mailto:support@novu.co","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":"support@acme.com"}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Stay productive,"},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Acme Inc."}]},{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/yelp-footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.19938650306749,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"© 2025 | Acme Inc., 350 Mission Street, San Francisco, CA 94105, U.S.A. | "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://www.yelp.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}}],"text":"www.acme.com"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}}]},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Footer%20-%20Email%20Footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}}]}',
          subject: 'Please update your payment information',
        },
      },
    ],
    tags: [],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
