/* eslint-disable no-console */
import '../../src/config';

import { UserRepository, SubscriberRepository, MemberRepository } from '@novu/dal';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../src/app.module';
import { normalizeEmail } from '../../src/app/shared/helpers/email-normalization.service';

export async function run() {
  console.log('Migration Normalize Users Email\n');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const userRepository = app.get(UserRepository);
  const subscriberRepository = app.get(SubscriberRepository);
  const memberRepository = app.get(MemberRepository);
  const users = await userRepository.find({});
  const sameEmailUsersIds: string[] = [];
  let normalizedEmailsCount = 0;
  let sameEmailUsersCount = 0;

  for (const user of users) {
    const beforeEmail = user.email;
    if (beforeEmail) {
      const normalizedEmail = normalizeEmail(beforeEmail);

      // if the email was normalized
      if (normalizedEmail !== beforeEmail) {
        console.log(
          `For the user: ${user._id} the email was "${beforeEmail}" now is normalized to "${normalizedEmail}"`
        );

        const sameEmailUser = await userRepository.findByEmail(normalizedEmail);
        if (sameEmailUser) {
          console.log(`--> Found the user ${sameEmailUser._id} with the same email "${sameEmailUser.email}"`);
          sameEmailUsersCount++;
          sameEmailUsersIds.push(sameEmailUser._id);
        }

        await userRepository.update(
          {
            _id: user._id,
          },
          {
            $set: {
              email: normalizedEmail,
            },
          }
        );

        normalizedEmailsCount++;
      }
    }
  }

  console.log('\n---------------------');
  console.log('Summary:');
  console.log(`Normalized user emails count: ${normalizedEmailsCount}`);
  console.log(`Users with the same emails count: ${sameEmailUsersCount}`);
  console.log(`Their ids: ${JSON.stringify(sameEmailUsersIds)}`);
  console.log('---------------------\n');

  for (const userId of sameEmailUsersIds) {
    const members = await memberRepository.findUserActiveMembers(userId);

    if (members.length > 1) {
      console.log(`User ${userId} has more than one active member`);
    } else {
      const subscribersCount = await subscriberRepository.count({
        _organizationId: members[0]._organizationId,
      });

      console.log(`User ${userId} has ${subscribersCount} subscribers`);
    }
  }

  app.close();
  process.exit(0);
}

run();
