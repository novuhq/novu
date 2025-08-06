export interface IBaseRepositoryService<T> {
  fetchSyncableResources(environmentId: string, organizationId: string): Promise<T[]>;
  createResourceMap(resources: T[]): Map<string, T>;
  getResourceIdentifier(resource: T): string;
}
