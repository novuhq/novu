/* eslint-disable no-console */
import '../src/config';
import { UserRepository, MemberRepository } from '@novu/dal';

import { connect } from './connect-to-dal';
import { normalizeEmail } from '../src/app/shared/helpers/email-normalization.service';
import { makeJsonBackup } from './make-json-backup';

const args = process.argv.slice(2);
const EMAIL = args[0];
const folder = 'remove-user-account';

connect(async () => {
  const userRepository = new UserRepository();
  const memberRepository = new MemberRepository();

  const email = normalizeEmail(EMAIL);
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error(`User account with email ${email} is not found`);
  }

  console.log(`The user with email: ${email} is found`);

  const memberOfOrganizations = await memberRepository._model.find({
    _userId: user._id,
  });
  console.log(`User is a member of ${memberOfOrganizations.length} organizations`);

  if (memberOfOrganizations.length > 0) {
    console.log(`Removing user from all organizations`);
    await makeJsonBackup(folder, 'members', memberOfOrganizations);
    await memberRepository._model.deleteMany({
      _userId: user._id,
    });
  }

  console.log(`Removing user account`);
  await makeJsonBackup(folder, 'user', user);
  await userRepository.delete({ _id: user._id });
});
