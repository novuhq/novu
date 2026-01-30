import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';

import { TranslationSettingsRepository } from '../dal';
import { OpenAITranslationService } from '../services';
import {
  ConnectionTestResponseDto,
  TranslationSettingsResponseDto,
  UpdateTranslationSettingsDto,
} from '../dtos';

/**
 * Controller for managing organization translation settings
 *
 * Provides endpoints to:
 * - Get current translation settings
 * - Update translation settings (API key, model, locales)
 * - Test OpenAI connection
 * - Delete/reset translation settings
 *
 * Security:
 * - All endpoints require authentication
 * - API keys are never exposed in responses (only last 4 chars)
 * - API keys are encrypted at rest
 *
 * Note: This controller is designed to be imported into apps/api
 * during Phase 5 integration. The @RequireAuthentication decorator
 * will be applied at the API level.
 */
@Controller('translation-settings')
@ApiTags('Translation Settings')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController() // Hidden from public docs until Phase 5
export class TranslationSettingsController {
  private readonly logger = new Logger(TranslationSettingsController.name);

  constructor(
    private readonly settingsRepository: TranslationSettingsRepository,
    private readonly openAITranslationService: OpenAITranslationService
  ) {}

  /**
   * Get translation settings for the current organization
   *
   * Returns the configured settings with the API key masked.
   * If no settings exist, returns null/404.
   *
   * @param user - Authenticated user session
   * @returns Translation settings with masked API key
   */
  @Get()
  @ApiOperation({
    summary: 'Get translation settings',
    description: 'Returns the translation settings for the current organization. API key is masked for security.',
  })
  async getSettings(
    @UserSession() user: UserSessionData
  ): Promise<TranslationSettingsResponseDto | null> {
    this.logger.debug(`Getting translation settings for org: ${user.organizationId}`);

    const settings = await this.settingsRepository.findByOrganization(user.organizationId);

    if (!settings) {
      return null;
    }

    return this.mapToResponseDto(settings);
  }

  /**
   * Update or create translation settings
   *
   * Performs an upsert operation - creates settings if they don't exist,
   * or updates existing settings with provided values.
   *
   * Partial updates are supported - only provided fields are updated.
   *
   * @param user - Authenticated user session
   * @param dto - Settings to update
   * @returns Updated translation settings
   */
  @Put()
  @ApiOperation({
    summary: 'Update translation settings',
    description: 'Creates or updates translation settings for the organization. Supports partial updates.',
  })
  async saveSettings(
    @UserSession() user: UserSessionData,
    @Body() dto: UpdateTranslationSettingsDto
  ): Promise<TranslationSettingsResponseDto> {
    this.logger.log(`Updating translation settings for org: ${user.organizationId}`);

    const settings = await this.settingsRepository.upsertSettings(user.organizationId, {
      openaiApiKey: dto.openaiApiKey,
      openaiModel: dto.openaiModel,
      defaultLocale: dto.defaultLocale,
      targetLocales: dto.targetLocales,
    });

    this.logger.log(`Translation settings updated for org: ${user.organizationId}`);

    return this.mapToResponseDto(settings);
  }

  /**
   * Test OpenAI connection
   *
   * Performs a minimal API call to verify:
   * - API key is valid
   * - API key has appropriate permissions
   * - Network connectivity is working
   *
   * @param user - Authenticated user session
   * @returns Connection test result
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test OpenAI connection',
    description: 'Tests the OpenAI API connection using the configured API key.',
  })
  async testConnection(
    @UserSession() user: UserSessionData
  ): Promise<ConnectionTestResponseDto> {
    this.logger.debug(`Testing OpenAI connection for org: ${user.organizationId}`);

    const settings = await this.settingsRepository.findByOrganization(user.organizationId);

    if (!settings) {
      return {
        success: false,
        message: 'Translation settings not configured',
        error: 'Please configure translation settings first',
      };
    }

    if (!settings.openaiApiKey) {
      return {
        success: false,
        message: 'API key not configured',
        error: 'Please configure an OpenAI API key',
      };
    }

    try {
      const testResult = await this.openAITranslationService.testConnection(
        user.organizationId
      );

      if (testResult.success) {
        this.logger.log(`OpenAI connection test successful for org: ${user.organizationId}`);

        return {
          success: true,
          message: 'Connection successful',
          model: testResult.model,
          latencyMs: testResult.latencyMs,
        };
      }

      this.logger.warn(`OpenAI connection test failed for org: ${user.organizationId}: ${testResult.error}`);

      return {
        success: false,
        message: 'Connection failed',
        error: testResult.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI connection test error for org: ${user.organizationId}: ${errorMessage}`);

      return {
        success: false,
        message: 'Connection test failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Delete translation settings
   *
   * Removes all translation settings for the organization.
   * This will disable automatic translation until settings are reconfigured.
   *
   * @param user - Authenticated user session
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete translation settings',
    description: 'Removes all translation settings for the organization.',
  })
  async clearSettings(
    @UserSession() user: UserSessionData
  ): Promise<void> {
    this.logger.log(`Deleting translation settings for org: ${user.organizationId}`);

    const deleted = await this.settingsRepository.deleteByOrganization(user.organizationId);

    if (!deleted) {
      this.logger.debug(`No translation settings found to delete for org: ${user.organizationId}`);
    } else {
      this.logger.log(`Translation settings deleted for org: ${user.organizationId}`);
    }
  }

  /**
   * Map entity to response DTO with masked API key
   */
  private mapToResponseDto(settings: {
    _id: string;
    _organizationId: string;
    openaiApiKey?: string;
    openaiModel: string;
    defaultLocale: string;
    targetLocales: string[];
    createdAt: string;
    updatedAt: string;
  }): TranslationSettingsResponseDto {
    const hasApiKey = !!settings.openaiApiKey;
    const apiKeyLast4 = hasApiKey && settings.openaiApiKey
      ? settings.openaiApiKey.slice(-4)
      : undefined;

    return {
      _id: settings._id,
      _organizationId: settings._organizationId,
      hasApiKey,
      apiKeyLast4,
      openaiModel: settings.openaiModel as any,
      defaultLocale: settings.defaultLocale,
      targetLocales: settings.targetLocales,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
