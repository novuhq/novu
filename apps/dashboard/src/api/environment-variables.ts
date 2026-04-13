import { del, get, patch, post } from './api.client';

export type EnvironmentVariableValueDto = {
  _environmentId: string;
  value: string;
};

export type EnvironmentVariableResponseDto = {
  _id: string;
  _organizationId: string;
  key: string;
  type: string;
  isSecret: boolean;
  defaultValue?: string;
  values: EnvironmentVariableValueDto[];
  createdAt: string;
  updatedAt: string;
};

export type CreateEnvironmentVariableDto = {
  key: string;
  type?: string;
  isSecret?: boolean;
  defaultValue?: string;
  values?: EnvironmentVariableValueDto[];
};

export type UpdateEnvironmentVariableDto = {
  key?: string;
  type?: string;
  isSecret?: boolean;
  defaultValue?: string;
  values?: EnvironmentVariableValueDto[];
};

export const getEnvironmentVariables = async ({
  search,
}: {
  search?: string;
} = {}): Promise<EnvironmentVariableResponseDto[]> => {
  const params = new URLSearchParams();

  if (search) {
    params.append('search', search);
  }

  const query = params.toString();
  const { data } = await get<{ data: EnvironmentVariableResponseDto[] }>(
    `/environment-variables${query ? `?${query}` : ''}`
  );

  return data;
};

export const getEnvironmentVariable = async (variableKey: string): Promise<EnvironmentVariableResponseDto> => {
  const { data } = await get<{ data: EnvironmentVariableResponseDto }>(`/environment-variables/${variableKey}`);

  return data;
};

export const createEnvironmentVariable = async (
  body: CreateEnvironmentVariableDto
): Promise<EnvironmentVariableResponseDto> => {
  const { data } = await post<{ data: EnvironmentVariableResponseDto }>(`/environment-variables`, { body });

  return data;
};

export const updateEnvironmentVariable = async (
  variableKey: string,
  body: UpdateEnvironmentVariableDto
): Promise<EnvironmentVariableResponseDto> => {
  const { data } = await patch<{ data: EnvironmentVariableResponseDto }>(`/environment-variables/${variableKey}`, {
    body,
  });

  return data;
};

export const deleteEnvironmentVariable = async (variableKey: string): Promise<void> => {
  await del(`/environment-variables/${variableKey}`);
};

export type GetEnvironmentVariableUsageResponse = {
  workflows: { name: string; workflowId: string }[];
};

export const getEnvironmentVariableUsage = async (
  variableKey: string
): Promise<GetEnvironmentVariableUsageResponse> => {
  const { data } = await get<{ data: GetEnvironmentVariableUsageResponse }>(
    `/environment-variables/${variableKey}/usage`
  );

  return data;
};
