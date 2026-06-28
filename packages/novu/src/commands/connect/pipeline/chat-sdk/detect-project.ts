export {
  defaultChatSdkScaffoldDirName,
  defaultScaffoldDirName,
  detectBridgeProject,
  detectChatSdkProject,
  type DetectedBridgeProject,
} from '../bridge/detect-project';

export type DetectedChatSdkProject = import('../bridge/detect-project').DetectedBridgeProject;
