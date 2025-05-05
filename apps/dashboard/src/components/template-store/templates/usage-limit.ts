import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const usageLimitTemplate: WorkflowTemplate = {
  id: 'usage-threshold',
  name: 'Usage Threshold Alert',
  description: 'Alert users about usage threshold',
  category: 'billing',
  isPopular: true,
  workflowDefinition: {
    name: 'Usage Threshold Alert',
    description: 'Alert users about usage threshold',
    workflowId: 'usage-threshold',
    steps: [
      {
        name: 'In-App Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {
          body: 'Your {{payload.usageType}} usage for {{payload.teamName}} has reached {{payload.usagePercentage}}% of your current allowance for this billing cycle ({{payload.billingStart}} – {{payload.billingEnd}})',
          avatar: 'https://dashboard-v2.novu.co/images/error-warning.svg',
          subject: 'Approaching Your payload.usageType Limit',
          primaryAction: {
            label: 'Check usage details',
            redirect: {
              target: '_self',
              url: '{{payload.action_url}}',
            },
          },
          redirect: {
            url: '',
            target: '_self',
          },
          disableOutputSanitization: false,
        },
      },
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: 'You’re at {{payload.usagePercentage}}% of your {{payload.usageType}} allowance',
          body: '{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Header%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/Acme%20Company%20Logo%20(Color).png?raw=true","alt":null,"title":null,"width":144,"height":29.52,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/usage-alert%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":400,"height":160.19900497512438,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"heading","attrs":{"textAlign":"center","level":2,"showIfKey":null},"content":[{"type":"text","text":"Approaching Your "},{"type":"variable","attrs":{"id":"payload.usageType","label":null,"fallback":null,"required":false}},{"type":"text","text":" Limit"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Hi "},{"type":"variable","attrs":{"id":"payload.userName","label":null,"fallback":null,"required":false}},{"type":"text","marks":[{"type":"bold"}],"text":","}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Your "},{"type":"variable","attrs":{"id":"payload.usageType","label":null,"fallback":null,"required":false},"marks":[{"type":"bold"}]},{"type":"text","marks":[{"type":"bold"}],"text":" usage for "},{"type":"variable","attrs":{"id":"payload.teamName","label":null,"fallback":null,"required":false},"marks":[{"type":"bold"}]},{"type":"text","marks":[{"type":"bold"}],"text":" has reached "},{"type":"variable","attrs":{"id":"payload.usagePercentage","label":null,"fallback":null,"required":false},"marks":[{"type":"bold"}]},{"type":"text","marks":[{"type":"bold"}],"text":"%"},{"type":"text","text":" of your current allowance for this billing cycle ("},{"type":"variable","attrs":{"id":"payload.billingStart","label":null,"fallback":null,"required":false}},{"type":"text","marks":[{"type":"bold"}],"text":" – "},{"type":"variable","attrs":{"id":"payload.billingEnd","label":null,"fallback":null,"required":false}},{"type":"text","text":")."}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","text":"If you exceed your limit before the cycle ends, we’ll automatically add an extra "},{"type":"variable","attrs":{"id":"payload.extraUsagePack","label":null,"fallback":null,"required":false}},{"type":"text","text":" for "},{"type":"variable","attrs":{"id":"payload.extraUsageCost","label":null,"fallback":null,"required":false}},{"type":"text","text":", giving you an additional "},{"type":"variable","attrs":{"id":"payload.extraUsageAmount","label":null,"fallback":null,"required":false}},{"type":"text","text":" "},{"type":"variable","attrs":{"id":"payload.usageType","label":null,"fallback":null,"required":false}},{"type":"text","text":" for this cycle."}]},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Want more control? You can:"}]},{"type":"bulletList","content":[{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":"Upgrade your plan"},{"type":"text","text":" to increase your allowance."}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":"Monitor usage"},{"type":"text","text":" in your account dashboard."}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":"Pause usage"},{"type":"text","text":" to prevent overages."}]},{"type":"spacer","attrs":{"height":"lg","showIfKey":null}}]}]},{"type":"spacer","attrs":{"height":"lg","showIfKey":null}},{"type":"button","attrs":{"text":"Check usage details","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#0abd9f","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32}},{"type":"paragraph","attrs":{"textAlign":"center","showIfKey":null},"content":[{"type":"text","text":"For more tips on optimizing your usage, visit our "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"#0abd9f"}},{"type":"bold"}],"text":"Support Center"},{"type":"text","marks":[{"type":"bold"}],"text":"."}]},{"type":"spacer","attrs":{"height":"lg","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Stay productive,"},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Acme Inc."}]},{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/yelp-footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.19938650306749,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"© 2025 | Acme Inc., 350 Mission Street, San Francisco, CA 94105, U.S.A. | "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://www.yelp.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}}],"text":"www.acme.com"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}}]},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Footer%20-%20Email%20Footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null}}]}',
        },
      },
    ],
    tags: [],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
