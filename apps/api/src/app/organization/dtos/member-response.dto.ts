import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { IsArray, IsDate, IsObject, IsString } from 'class-validator';
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

  @ApiProperty()
  @IsDate()
  answerDate?: Date;

  @ApiProperty()
  @IsDate()
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
  @IsArray()
  roles?: MemberRoleEnum;

  @ApiPropertyOptional()
  @IsObject()
  invite?: MemberInviteDTO;

  @ApiPropertyOptional({
    enum: { ...MemberStatusEnum },
  })
  @IsString()
  memberStatus?: MemberStatusEnum;

  @ApiProperty()
  @IsString()
  _organizationId: string;
}
