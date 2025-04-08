import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from '../types';

export const trialEndsTemplate: WorkflowTemplate = {
  id: 'trial-ends',
  name: 'Trial Ends',
  description: "This email will be sent 7 days before a customer's trial ends. ",
  category: 'billing',
  isPopular: false,
  workflowDefinition: {
    name: 'Trial Ends',
    description: "This email will be sent 7 days before a customer's trial ends. ",
    workflowId: 'trial-ends',
    steps: [
      {
        name: 'In-App Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {
          body: 'Once your trial expires, your access to paid features will be **paused** unless you upgrade.',
          avatar: 'https://dashboard-v2.novu.co/images/info-2.svg',
          subject: 'Your trial ends in {{payload.days_remaining }}days',
          primaryAction: {
            label: 'Upgrade your plan',
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
          body: '{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Header%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/Acme%20Company%20Logo%20(Color).png?raw=true","alt":null,"title":null,"width":200,"height":41,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Trial%20Ends%20(clock)%20-%20Email%20Header.png?raw=true","alt":null,"title":null,"width":500,"height":200,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"heading","attrs":{"textAlign":"center","level":2,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}},{"type":"bold"}],"text":"Your trial ends in "},{"type":"variable","attrs":{"id":"payload.days_remaining","label":null,"fallback":null,"required":true},"marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}},{"type":"bold"}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}},{"type":"bold"}],"text":" days"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Hi "},{"type":"variable","attrs":{"id":"payload.first_name","label":null,"fallback":null,"required":true}},{"type":"text","text":","}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"We hope you\'ve had the chance to explore "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}},{"type":"bold"}],"text":"Acme"},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":" and "},{"type":"variable","attrs":{"id":"payload.additional_product_name","label":null,"fallback":null,"required":true}},{"type":"text","text":" over the past two weeks and see how they can help you streamline your workflow and improve efficiency."}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}},{"type":"bold"}],"text":"Your free trial ends in "},{"type":"variable","attrs":{"id":"payload.days_remaining","label":null,"fallback":null,"required":true}},{"type":"text","marks":[{"type":"bold"}],"text":" days, on "},{"type":"variable","attrs":{"id":"payload.trial_end_date","label":null,"fallback":null,"required":true},"marks":[{"type":"bold"}]},{"type":"text","marks":[{"type":"bold"}],"text":". "}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Once your trial expires, your access to paid features will be "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(243, 91, 68)"}},{"type":"bold"}],"text":"paused"},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":" unless you upgrade."}]},{"type":"heading","attrs":{"textAlign":"left","level":3,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"What are the benefits of upgrading?"}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"By upgrading, you\'li continue to have access to:"}]},{"type":"bulletList","content":[{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Advanced automation & event tracking"}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Priority support & increased usage limits"}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Multi-channel notifications & premium integrations"}]}]}]},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"To keep your workflows running smoothly,"},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(0, 0, 0)"}}],"text":" "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}},{"type":"bold"}],"text":"add a payment method"},{"type":"text","text":" "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"or"},{"type":"text","text":" "},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}},{"type":"bold"}],"text":"upgrade your plan"},{"type":"text","text":"."}]},{"type":"button","attrs":{"text":"Upgrade your plan","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#0abd9f","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Stay productive, "},{"type":"hardBreak","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}]},{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"Acme Inc."}]},{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/yelp-footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.19938650306749,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null},"content":[{"type":"text","marks":[{"type":"textStyle","attrs":{"color":"rgb(34, 45, 56)"}}],"text":"© 2025 | Acme Inc., 350 Mission Street, San Francisco, CA 94105, U.S.A. | "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://www.yelp.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"rgb(10, 189, 159)"}}],"text":"www.acme.com"}]},{"type":"spacer","attrs":{"height":"md","showIfKey":null}}]},{"type":"image","attrs":{"src":"https://github.com/iampearceman/Design-assets/blob/main/emails/Colored%20Footer%20-%20Email%20Footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.4,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"paragraph","attrs":{"textAlign":"left","showIfKey":null}}]}',
          subject: 'Your Acme Inc. trial ends soon',
        },
      },
    ],
    tags: [],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
