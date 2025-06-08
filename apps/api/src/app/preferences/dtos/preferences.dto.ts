import { ChannelTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';

/**
 * @deprecated Use an updated preference structure.
 * This class will be removed in future versions.
 */
export class WorkflowPreference {
  /**
   * @deprecated Use alternative enablement mechanism.
   */
  @IsBoolean()
  enabled: boolean;

  /**
   * @deprecated Read-only flag is no longer supported.
   */
  @IsBoolean()
  readOnly: boolean;
}

/**
 * @deprecated Use an updated channel preference structure.
 * Will be removed in future versions.
 */
export class ChannelPreference {
  /**
   * @deprecated Use alternative channel enablement method.
   */
  @IsBoolean()
  enabled: boolean;
}

/**
 * @deprecated Channels configuration is being restructured.
 * Use the new channel management approach.
 */
export class Channels {
  /**
   * @deprecated In-app channel preference is deprecated.
   */
  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.IN_APP]: ChannelPreference;

  /**
   * @deprecated Email channel preference is deprecated.
   */
  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.EMAIL]: ChannelPreference;

  /**
   * @deprecated SMS channel preference is deprecated.
   */
  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.SMS]: ChannelPreference;

  /**
   * @deprecated Chat channel preference is deprecated.
   */
  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.CHAT]: ChannelPreference;

  /**
   * @deprecated Push channel preference is deprecated.
   */
  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.PUSH]: ChannelPreference;
}

/**
 * @deprecated Preferences DTO is being replaced.
 * Use the new preferences management approach.
 */
export class PreferencesDto {
  /**
   * @deprecated Global workflow preference is no longer used.
   */
  @ValidateNested({ each: true })
  @Type(() => WorkflowPreference)
  all: WorkflowPreference;

  /**
   * @deprecated Channels configuration is deprecated.
   */
  @ValidateNested({ each: true })
  @Type(() => Channels)
  channels: Channels;
}

// Optional: Runtime deprecation warning
if (process.env.NODE_ENV !== 'production') {
  console.warn(
    'DEPRECATION WARNING: PreferencesDto and related classes are deprecated ' +
      'and will be removed in future versions. Please migrate to the new preferences structure.'
  );
}
