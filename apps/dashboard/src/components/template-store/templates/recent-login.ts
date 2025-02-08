import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const recentLoginTemplate: WorkflowTemplate = {
  id: 'recent-login',
  name: 'Recent Login',
  description: 'Alert users about new device logins',
  category: 'authentication',
  isPopular: true,
  workflowDefinition: {
    name: 'Recent Login',
    description: '',
    workflowId: 'recent-login',
    steps: [
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          body: '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/5f1528e4a6109a09086e396b5c9d43cb.png?raw=true","alt":null,"title":null,"width":137,"height":102.75,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/yelp-header.png?raw=true","alt":null,"title":null,"width":654,"height":264,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"","align":"left","borderWidth":0,"borderColor":"","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"heading","attrs":{"textAlign":"left","level":3},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Review a recent login from a new device"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"There was a recent login to your "},{"type":"variable","attrs":{"id":"payload.company","label":null,"fallback":null,"required":false}},{"type":"text","text":" account. Please review the details:"},{"type":"hardBreak"}]}]},{"type":"section","attrs":{"borderRadius":6,"backgroundColor":"#f7f7f7","align":"left","borderWidth":0,"borderColor":"#e2e2e2","paddingTop":12,"paddingRight":12,"paddingBottom":12,"paddingLeft":12,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Account"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.account","label":null,"fallback":null,"required":false}},{"type":"text","text":" "},{"type":"hardBreak"},{"type":"hardBreak"},{"type":"text","marks":[{"type":"bold"}],"text":"IP & Approximate location"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.ip_address","label":null,"fallback":null,"required":false}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Time"},{"type":"hardBreak"},{"type":"variable","attrs":{"id":"payload.timeStamp","label":null,"fallback":null,"required":false}},{"type":"text","text":" "}]}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"hardBreak"},{"type":"text","text":"If this was not you, "},{"type":"text","marks":[{"type":"bold"}],"text":"reset your password now"},{"type":"text","text":" to protect your account and enroll in multi-factor authentication in the \\"My Account\\" tab of \\"Settings\\". If this wasn\'t you or if you have additional questions, please see our support page."}]},{"type":"button","attrs":{"text":"Go to my account","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#cd5141","textColor":"#ffffff","showIfKey":null}},{"type":"image","attrs":{"src":"https://github.com/novuhq/blog/blob/main/media-assets/yelp-footer.png?raw=true","alt":null,"title":null,"width":654,"height":65.19938650306749,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"footer","attrs":{"textAlign":"center","maily-component":"footer"},"content":[{"type":"text","text":"© 2024 | Acme Inc., 350 Mission Street, San Francisco, CA 94105, U.S.A. | "},{"type":"text","marks":[{"type":"link","attrs":{"href":"http://www.yelp.com","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}}],"text":"www.acme.com"}]}]}',
          subject: 'A new device logged into your account',
        },
      },
    ],
    tags: ['authentication'],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
