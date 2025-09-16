import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContextDBModel, ContextEntity, ContextRepository, EnforceEnvOrOrgIds } from '@novu/dal';
import {
  ContextData,
  ContextObject,
  ContextTypeEnum,
  isFullObjectContext,
  isStringContext,
  isTypeKeyContext,
} from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { ResolveContextCommand } from './resolve-context.command';

@Injectable()
export class ResolveContext {
  constructor(
    private logger: PinoLogger,
    private contextRepository: ContextRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  public async execute(command: ResolveContextCommand): Promise<ContextEntity> {
    if (isStringContext(command.context)) {
      return this.handleStringContext(command);
    }

    if (isTypeKeyContext(command.context)) {
      return this.handleTypeKeyContext(command);
    }

    if (isFullObjectContext(command.context)) {
      return this.handleFullObjectContext(command);
    }

    throw new BadRequestException('Invalid context format');
  }

  private async handleStringContext(command: ResolveContextCommand): Promise<ContextEntity> {
    const context = await this.findContext({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.context as string,
    });

    if (!context) {
      throw new NotFoundException(
        `Context with identifier "${command.context}" not found in environment ${command.environmentId}`
      );
    }

    return context;
  }

  private async handleTypeKeyContext(command: ResolveContextCommand): Promise<ContextEntity> {
    const contextType = Object.keys(command.context)[0] as ContextTypeEnum;
    const identifier = command.context[contextType];

    if (!identifier) {
      throw new BadRequestException('Invalid context format: identifier is required');
    }

    return this.findOrCreateContext({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier,
      type: contextType,
    });
  }

  private async handleFullObjectContext(command: ResolveContextCommand): Promise<ContextEntity> {
    const { identifier, type, data } = command.context as ContextObject;

    const baseQuery: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier,
      ...(type && { type }),
    };

    const existingContext = await this.findContext(baseQuery);

    if (existingContext) {
      return this.updateContextIfNeeded(baseQuery, data, existingContext);
    }

    if (!type) {
      throw new BadRequestException('Context type is required when creating a new context');
    }

    return this.createContext({
      ...baseQuery,
      type,
      data: data || {},
    });
  }

  private async findContext(query: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds) {
    return this.contextRepository.findOne(query);
  }

  private async createContext(contextData: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds): Promise<ContextEntity> {
    const existingContext = await this.contextRepository.findOne({
      _environmentId: contextData._environmentId,
      _organizationId: contextData._organizationId,
      identifier: contextData.identifier,
    });

    if (existingContext) {
      throw new BadRequestException(
        `Context with identifier ${contextData.identifier} already exists in environment ${contextData._environmentId}`
      );
    }

    const newContext = await this.contextRepository.create(contextData);
    return newContext;
  }

  private async findOrCreateContext(
    contextData: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds
  ): Promise<ContextEntity> {
    const existingContext = await this.findContext(contextData);

    if (existingContext) {
      return existingContext;
    }

    return this.createContext({
      ...contextData,
      data: {},
    });
  }

  private async updateContextIfNeeded(
    baseQuery: FilterQuery<ContextDBModel> & EnforceEnvOrOrgIds,
    data: ContextData,
    existingContext: ContextEntity
  ): Promise<ContextEntity> {
    if (data === undefined) {
      return existingContext;
    }

    const updatedContext = await this.contextRepository.findOneAndUpdate(baseQuery, { $set: { data } }, { new: true });

    if (!updatedContext) {
      throw new NotFoundException('Updated context not found after update operation.');
    }
    return updatedContext;
  }
}
