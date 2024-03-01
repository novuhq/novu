import { PlatformException } from './exceptions';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

export const requireInject = (inject: RequireInject, moduleRef?: ModuleRef) => {
  if (inject === RequireInjectEnum.CHIMERA_CONNECT) {
    return initiateChimeraConnector(moduleRef);
  }
};

const initiateChimeraConnector = (moduleRef: ModuleRef) => {
  try {
    if (
      process.env.NOVU_ENTERPRISE === 'true' ||
      process.env.CI_EE_TEST === 'true'
    ) {
      if (!require('@novu/ee-chimera-connect')?.ChimeraConnector) {
        throw new PlatformException('ChimeraConnector module is not loaded');
      }

      return moduleRef.get(
        require('@novu/ee-chimera-connect')?.ChimeraConnector,
        {
          strict: false,
        }
      );
    }
  } catch (e) {
    Logger.error(
      e,
      `Unexpected error while importing enterprise modules`,
      'ChimeraConnector'
    );
  }
};

type RequireInject = `${RequireInjectEnum}`;

enum RequireInjectEnum {
  CHIMERA_CONNECT = 'ChimeraConnector',
}

export interface IChimeraDelayResponse {
  amount: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  type: 'regular';
}
