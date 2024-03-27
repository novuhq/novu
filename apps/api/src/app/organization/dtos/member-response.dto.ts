import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { IsArray, IsDate, IsObject, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberUserDto {
  @ApiProperty()
  @IsString()
  _id: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  email: string;
}

export class MemberInviteDTO {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsDate()
  invitationDate: Date;

  @ApiPropertyOptional()
  @IsDate()
  answerDate?: Date;

  @ApiProperty()
  @IsString()
  _inviterId: string;
}

export class MemberResponseDto {
  @ApiProperty()
  @IsString()
  _id: string;

  @ApiProperty()
  @IsString()
  _userId: string;

  @ApiPropertyOptional()
  @IsObject()
  user?: MemberUserDto;

  @ApiPropertyOptional({
    enum: MemberRoleEnum,
    isArray: true,
  })
  @IsEnum(MemberRoleEnum)
  roles?: MemberRoleEnum;

  @ApiPropertyOptional()
  @IsObject()
  invite?: MemberInviteDTO;

  @ApiPropertyOptional({
    enum: { ...MemberStatusEnum },
  })
  @IsEnum(MemberStatusEnum)
  memberStatus?: MemberStatusEnum;

  @ApiProperty()
  @IsString()
  _organizationId: string;
}
