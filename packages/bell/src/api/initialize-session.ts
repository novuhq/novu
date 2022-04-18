import { post } from './api.service';

export async function initializeSession(appId: string, userId: string) {
  return await post(`/widgets/session/initialize`, {
    applicationIdentifier: appId,
    $user_id: userId,
  });
}
