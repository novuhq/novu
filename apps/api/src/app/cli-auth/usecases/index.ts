import { ApproveCliDeviceSession } from './approve-cli-device-session/approve-cli-device-session.usecase';
import { CreateCliDeviceSession } from './create-cli-device-session/create-cli-device-session.usecase';
import { GetCliDeviceSession } from './get-cli-device-session/get-cli-device-session.usecase';

export const USE_CASES = [CreateCliDeviceSession, GetCliDeviceSession, ApproveCliDeviceSession];
