import { Injectable } from '@nestjs/common';
import { dashboardSanitizeControlValues, Instrument, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { ContentIssueEnum, LAYOUT_CONTENT_VARIABLE, LayoutIssuesDto, ResourceOriginEnum } from '@novu/shared';
import merge from 'lodash/merge';
import { hasMailyVariable, isStringifiedMailyJSONContent } from '../../../shared/helpers/maily-utils';
import {
  ControlIssues,
  processControlValuesByLiquid,
  processControlValuesBySchema,
} from '../../../shared/utils/issues';
import { LayoutVariablesSchemaCommand, LayoutVariablesSchemaUseCase } from '../layout-variables-schema';
import { BuildLayoutIssuesCommand } from './build-layout-issues.command';

@Injectable()
export class BuildLayoutIssuesUsecase {
  constructor(
    private layoutVariablesSchemaUseCase: LayoutVariablesSchemaUseCase,
    private logger: PinoLogger
  ) {}

  @InstrumentUsecase()
  async execute(command: BuildLayoutIssuesCommand): Promise<LayoutIssuesDto> {
    const { resourceOrigin, environmentId, organizationId, controlSchema, controlValues } = command;

    const layoutVariablesSchema = await this.layoutVariablesSchemaUseCase.execute(
      LayoutVariablesSchemaCommand.create({
        environmentId,
        organizationId,
        controlValues: controlValues ?? {},
      })
    );

    const content = (controlValues?.email as { body: string })?.body;
    const isMailyContent = isStringifiedMailyJSONContent(content);
    const contentIssues: ControlIssues = {};
    if (
      (isMailyContent && !hasMailyVariable(content, LAYOUT_CONTENT_VARIABLE)) ||
      (!isMailyContent && !this.hasHtmlVariable(content, LAYOUT_CONTENT_VARIABLE))
    ) {
      contentIssues.controls = {
        'email.body': [
          {
            message: `The layout body should contain the "${LAYOUT_CONTENT_VARIABLE}" variable`,
            issueType: ContentIssueEnum.MISSING_VALUE,
          },
        ],
      };
    }

    const sanitizedControlValues = this.sanitizeControlValues(controlValues ?? {}, resourceOrigin);

    const schemaIssues = processControlValuesBySchema({
      controlSchema,
      controlValues: sanitizedControlValues ?? {},
    });

    const liquidIssues: ControlIssues = {};
    processControlValuesByLiquid({
      variableSchema: layoutVariablesSchema,
      currentValue: controlValues ?? {},
      currentPath: [],
      issues: liquidIssues,
    });

    return merge(contentIssues, schemaIssues, liquidIssues);
  }

  @Instrument()
  private sanitizeControlValues(
    newControlValues: Record<string, unknown> | undefined,
    layoutOrigin: ResourceOriginEnum
  ) {
    return newControlValues && layoutOrigin === ResourceOriginEnum.NOVU_CLOUD
      ? dashboardSanitizeControlValues(this.logger, newControlValues, 'layout') || {}
      : this.frameworkSanitizeEmptyStringsToNull(newControlValues) || {};
  }

  private frameworkSanitizeEmptyStringsToNull(
    obj: Record<string, unknown> | undefined | null
  ): Record<string, unknown> | undefined | null {
    if (typeof obj !== 'object' || obj === null || obj === undefined) return obj;

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (typeof value === 'string' && value.trim() === '') {
          return [key, null];
        }
        if (typeof value === 'object') {
          return [key, this.frameworkSanitizeEmptyStringsToNull(value as Record<string, unknown>)];
        }

        return [key, value];
      })
    );
  }

  private hasHtmlVariable(content: string, variable: string): boolean {
    const liquidVariableRegex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g');

    return liquidVariableRegex.test(content);
  }
}
