import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { SignupSourceEnum } from '@novu/shared';
import { trackSignupStarted } from '../../../shared/helpers/signup-analytics';
import { TrackHumanSignupStartedCommand } from './track-human-signup-started.command';

/**
 * `Signup Started` for a sign-up to the Human Clerk app. Clerk redelivers a webhook that failed, so the
 * event carries an `$insert_id` derived from the user: Mixpanel keeps only one event per id.
 */
@Injectable()
export class TrackHumanSignupStarted {
  constructor(private readonly analyticsService: AnalyticsService) {}

  execute(command: TrackHumanSignupStartedCommand): void {
    trackSignupStarted(this.analyticsService, command.humanUserId, {
      source: SignupSourceEnum.HUMAN,
      $insert_id: buildInsertId(command.humanUserId),
    });
  }
}

/** Mixpanel `$insert_id`s are at most 36 alphanumeric characters or dashes. */
function buildInsertId(humanUserId: string): string {
  return createHash('sha256').update(`signup-started:human:${humanUserId}`).digest('hex').slice(0, 32);
}
