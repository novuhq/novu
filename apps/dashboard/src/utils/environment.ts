const LOCAL_STORAGE_LAST_ENVIRONMENT_ID = 'nv_last_environment_id';

export function saveEnvironmentId(environmentId: string) {
  localStorage.setItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID, environmentId);
}

export function getEnvironmentId() {
  return localStorage.getItem(LOCAL_STORAGE_LAST_ENVIRONMENT_ID);
}
