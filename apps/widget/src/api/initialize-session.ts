import { post } from './api.service';

export async function initializeSession(
  appId: string,
  userId: string,
  userInfo: { email: string; firstName: string; lastName: string; phone: string }
) {
  return await post(`/widgets/session/initialize`, {
    applicationIdentifier: appId,
    $user_id: userId,
    $first_name: userInfo.firstName,
    $last_name: userInfo.lastName,
    $email: userInfo.email,
    $phone: userInfo.phone,
  });
}
