/* eslint-disable no-console */

/**
 * Migration to centralize workflow and subscriber preferences.
 * Preferences are migrated in the following order:
 *
 * - workflow preferences
 *   -> preferences with workflow-resource type
 *   -> preferences with user-workflow type
 * - subscriber global preference
 *    -> preferences with subscriber global type
 * - subscriber workflow preferences
 *    -> preferences with subscriber workflow type
 *
 * Subscriber workflow preferences must be migrated after global preferences because
 * the upsert subscriber global preferences will delete the subscriber workflow preferences
 * with a matching channel.
 *
 * Depending on the size of your dataset, the following additional indexes will help with of the
 * Subscriber Preference Migration:
 * - { level: 1 }
 * - { level: 1, _id: 1 }
 */
export async function preferenceCentralization() {
  /**
   * IMPORTANT: This migration depends on SubscriberPreferencesRepository which is now removed.
   * Please checkout the `v2.1.0` tag and run the migration from there.
   * @see https://github.com/novuhq/novu/releases/tag/v2.1.0
   */
  console.error('This migration depends on SubscriberPreferencesRepository which is now removed.');
  console.error('Please checkout the `v2.1.0` tag and run the migration from there.');
  console.error('@see https://github.com/novuhq/novu/releases/tag/v2.1.0');

  process.exit(1);
}

preferenceCentralization();
