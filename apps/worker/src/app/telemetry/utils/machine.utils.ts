import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

const machineIdFilePath = path.join(os.homedir(), '.novu-machine-id');

export function loadOrCreateMachineId(): string {
  try {
    if (fs.existsSync(machineIdFilePath)) {
      return fs.readFileSync(machineIdFilePath, 'utf-8').trim();
    } else {
      const machineId = uuidv4();
      fs.writeFileSync(machineIdFilePath, machineId);
      return machineId;
    }
  } catch (error) {
    Logger.error('Error loading or creating machine ID, falling back to hostname and IP.', error);
    return getFallbackMachineId();
  }
}

export function getMachineInfo() {
  const networkInterfaces = os.networkInterfaces();
  const networkInterface = networkInterfaces['eth0'] || networkInterfaces['en0'] || [];
  const ipAddress = networkInterface.find((iface) => iface.family === 'IPv4' && !iface.internal)?.address || 'Unknown';

  return {
    hostname: os.hostname(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    platform: os.platform(),
    release: os.release(),
    ipAddress: ipAddress,
  };
}

function getFallbackMachineId(): string {
  const machineInfo = getMachineInfo();
  return `${machineInfo.hostname}-${machineInfo.ipAddress}`;
}
