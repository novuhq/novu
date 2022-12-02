import { Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { GetOrganization } from '../get-organization/get-organization.usecase';
import { GetOrganizationCommand } from '../get-organization/get-organization.command';
import { GetMyOrganizationCommand } from './get-my-organization.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetMyOrganization {
  constructor(private getOrganizationUseCase: GetOrganization) {}

  async execute(command: GetMyOrganizationCommand) {
    const organization = await this.getOrganizationUseCase.execute(
      GetOrganizationCommand.create({
        id: command.id,
        userId: command.userId,
      })
    );
    if (!organization) throw new UnauthorizedException('No organization found');

    return organization;
  }
}
