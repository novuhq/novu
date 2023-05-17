export interface IFeatureFlagsService {
  initialize: () => Promise<void>;
  gracefullyShutdown: () => Promise<void>;
}
