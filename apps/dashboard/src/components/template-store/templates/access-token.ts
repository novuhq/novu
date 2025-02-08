import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { WorkflowTemplate } from './types';

export const accessTokenTemplate: WorkflowTemplate = {
  id: 'access-token',
  name: 'Access Token',
  description: 'Alert users about new access token creation',
  category: 'authentication',
  isPopular: true,
  workflowDefinition: {
    name: 'Access Token',
    description: 'Notify a user about a creation of a personal access token in their GitHub account',
    workflowId: 'git-hub-access-token',
    steps: [
      {
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          body: '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg","alt":null,"title":null,"width":57,"height":57,"alignment":"left","externalLink":null,"isExternalLinkVariable":false,"isSrcVariable":false,"showIfKey":null}},{"type":"heading","attrs":{"textAlign":"left","level":3},"content":[{"type":"variable","attrs":{"id":"payload.username","label":null,"fallback":"John Doe","required":false},"marks":[{"type":"bold"}]},{"type":"text","text":", a personal access token was created on your account."}]},{"type":"section","attrs":{"borderRadius":6,"backgroundColor":"#f7f7f7","align":"left","borderWidth":1,"borderColor":"#e2e2e2","paddingTop":12,"paddingRight":12,"paddingBottom":12,"paddingLeft":12,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","marks":[{"type":"bold"}],"text":"Hey "},{"type":"variable","attrs":{"id":"payload.username","label":null,"fallback":"John Doe","required":false},"marks":[{"type":"bold"}]},{"type":"text","marks":[{"type":"bold"}],"text":"!"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"A fine-grained personal access token ("},{"type":"variable","attrs":{"id":"payload.accessToken.name","label":null,"fallback":null,"required":false}},{"type":"text","text":") was recently added to your account."}]},{"type":"button","attrs":{"text":"View your token","isTextVariable":false,"url":"payload.link","isUrlVariable":true,"alignment":"center","variant":"filled","borderRadius":"smooth","buttonColor":"#428646","textColor":"#ffffff","showIfKey":null}}]},{"type":"paragraph","attrs":{"textAlign":"left"}},{"type":"footer","attrs":{"textAlign":"center","maily-component":"footer"},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://www.google.com/search?q=github+security&client=firefox-b-d&sca_esv=d12e58ed6977e94a&ei=QIR6Z6XIN6LV7M8PlMnhCA&oq=github+security&gs_lp=Egxnd3Mtd2l6LXNlcnAiD2dpdGh1YiBzZWN1cml0eSoCCAAyCxAAGIAEGJECGIoFMgsQABiABBiRAhiKBTIFEAAYgAQyCxAAGIAEGJECGIoFMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAESPYdUPsFWOMUcAB4A5ABAJgBnAmgAbQZqgEJMy0xLjQuNy0xuAEDyAEA-AEBmAIIoALJGcICBBAAGEeYAwCIBgGQBgiSBwsyLjMtMS40LjctMaAHziE&sclient=gws-wiz-serp","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"#0062ff"}}],"text":"Your security audit log"},{"type":"text","text":" ・ "},{"type":"text","marks":[{"type":"link","attrs":{"href":"https://docs.github.com/en/support/contacting-github-support","target":"_blank","rel":"noopener noreferrer nofollow","class":"mly-no-underline","isUrlVariable":false}},{"type":"textStyle","attrs":{"color":"#0062ff"}}],"text":"Contact support"}]},{"type":"footer","attrs":{"textAlign":"center","maily-component":"footer"},"content":[{"type":"text","text":"GitHub, Inc. ・88 Colin P Kelly Jr Street ・San Francisco, CA 94107"}]}]}',
          subject: 'Personal Access Token Was Created',
        },
      },
    ],
    tags: ['security'],
    active: true,
    __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
  },
};
