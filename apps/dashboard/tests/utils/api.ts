export const syncBridge = async ({
  jwt,
  bridgeUrl,
  environmentId,
}: {
  jwt: string;
  bridgeUrl: string;
  environmentId: string;
}) => {
  const response = await fetch(`${process.env.API_URL}/v1/bridge/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'Novu-Environment-Id': environmentId,
    },
    body: JSON.stringify({ bridgeUrl }),
  });

  const body = await response.json();

  return body.data;
};
