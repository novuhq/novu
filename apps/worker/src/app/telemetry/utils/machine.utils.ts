import { Logger } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { freemem, homedir, hostname, networkInterfaces as os_networkInterfaces, platform, release, totalmem } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const machineIdFilePath = join(homedir(), '.novu-machine-id');

export function loadOrCreateMachineId(): string {
  try {
    if (existsSync(machineIdFilePath)) {
      return readFileSync(machineIdFilePath, 'utf-8').trim();
    } else {
      const machineId = uuidv4();
      writeFileSync(machineIdFilePath, machineId);

      return machineId;
    }
  } catch (error) {
    Logger.error('Error loading or creating machine ID, falling back to hostname and IP.', error);

    return getFallbackMachineId();
  }
}

export function getMachineInfo() {
  const networkInterfaces = os_networkInterfaces();
  const networkInterface = networkInterfaces.eth0 || networkInterfaces.en0 || [];
  const ipAddress = networkInterface.find((iface) => iface.family === 'IPv4' && !iface.internal)?.address || 'Unknown';

  return {
    hostname: hostname(),
    totalMemory: totalmem(),
    freeMemory: freemem(),
    platform: platform(),
    release: release(),
    ipAddress,
  };
}

function getFallbackMachineId(): string {
  const machineInfo = getMachineInfo();

  return `${machineInfo.hostname}-${machineInfo.ipAddress}`;
}
