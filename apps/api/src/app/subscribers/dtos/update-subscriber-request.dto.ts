import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsLocale, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { SubscriberChannelDto } from './create-subscriber-request.dto';

// Define the type for custom data, allowing for additional properties
export class UpdateSubscriberRequestDto {
  @ApiProperty({
    description: 'The email address of the subscriber.',
    example: 'john.doe@example.com',
    required: false,
  })
  @Transform((params) => (params.value === '' ? null : params.value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'The first name of the subscriber.',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'The last name of the subscriber.',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'The phone number of the subscriber.',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'The avatar URL of the subscriber.',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description: 'The locale of the subscriber, for example "en-US".',
    example: 'en-US',
    required: false,
  })
  @IsLocale()
  @IsOptional()
  locale?: string;

  @ApiProperty({
    description: 'Custom data associated with the subscriber. Can contain any additional properties.',
    type: 'object',
    additionalProperties: true, // Allow additional properties
    example: {
      preferences: {
        notifications: true,
        theme: 'dark',
      },
      tags: ['premium', 'newsletter'],
    },
    required: false,
  })
  @IsOptional()
  data?: {
    [key: string]: any;
  };

  @ApiProperty({
    description: 'An array of communication channels for the subscriber.',
    type: SubscriberChannelDto,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  channels?: SubscriberChannelDto[];
}
