import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseRepository, EnvironmentRepository } from '@novu/dal';
import { EnvironmentEnum, UserSessionData } from '@novu/shared';

export interface IEnvironmentValidationParams {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  user: UserSessionData;
}

@Injectable()
export class EnvironmentValidationService {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async validateEnvironments(params: IEnvironmentValidationParams): Promise<void> {
    const { sourceEnvironmentId, targetEnvironmentId, user } = params;

    if (sourceEnvironmentId === targetEnvironmentId) {
      throw new BadRequestException('Source and target environments cannot be the same');
    }

    if (!BaseRepository.isInternalId(sourceEnvironmentId) || !BaseRepository.isInternalId(targetEnvironmentId)) {
      throw new BadRequestException('Invalid environment ID format');
    }

    try {
      const [sourceEnv, targetEnv] = await Promise.all([
        this.environmentRepository.findOne({
          _id: sourceEnvironmentId,
          _organizationId: user.organizationId,
        }),
        this.environmentRepository.findOne({
          _id: targetEnvironmentId,
          _organizationId: user.organizationId,
        }),
      ]);

      if (!sourceEnv) {
        throw new BadRequestException('Source environment not found');
      }

      if (!targetEnv) {
        throw new BadRequestException('Target environment not found');
      }
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid environment ID format');
      }
      throw error;
    }
  }

  async getDevelopmentEnvironmentId(organizationId: string): Promise<string> {
    const developmentEnvironment = await this.environmentRepository.findOne({
      _organizationId: organizationId,
      name: EnvironmentEnum.DEVELOPMENT,
    });

    if (!developmentEnvironment) {
      throw new BadRequestException('Development environment not found');
    }

    return developmentEnvironment._id;
  }
}
