import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import type { Response } from 'express';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { HumanAgentPictureService } from './services/human-agent-picture.service';

/**
 * The public address of an agent's picture. It is shown where nobody is signed in: on the invite page
 * and in chat apps. The address changes with the picture, so a copy can be kept for good.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/human/agent-pictures')
@ApiExcludeController()
export class HumanAgentPicturesPublicController {
  constructor(private readonly humanAgentPicture: HumanAgentPictureService) {}

  @Get('/:environmentId/:agentId/:version')
  async getPicture(
    @Param('environmentId') environmentId: string,
    @Param('agentId') agentId: string,
    @Param('version') version: string,
    @Res() res: Response
  ): Promise<void> {
    const picture = await this.humanAgentPicture.read({ environmentId, agentId, version });
    if (!picture) {
      throw new NotFoundException();
    }

    res
      .status(200)
      .set({
        'Content-Type': picture.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        // The file is an image and nothing else: a browser must never guess another type for it.
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      })
      .send(picture.file);
  }
}
