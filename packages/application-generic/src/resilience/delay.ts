/**
 * This function takes in a time amount and a percentage for the variance for the jitter.
 * For example, if a time for 10 minutes  is passed in then with a variance of .1 percent
 * then the time that this function will return would be between [9m, 11m).
 * @param time the base amount of time that we need to add some jitter to.
 * @param variance a percentage that sets the size of the range of possibilities based off of the time attribute. Default is 0.1.
 */
export function addJitter(time, variance = 0.1): number {
  const variant = variance * time * Math.random();

  return Math.floor(time - (variance * time) / 2 + variant);
}

/**
 * This method uses an exponential function to get the amount
 * to delay by from the number of retries upto a specified limit
 * @param numOfRetries the number of retries that have been attempted so far
 * @param limit Default 300 seconds. Limit in seconds that this function is allowed to produce.
 */

export function getDelay(numOfRetries, limit = 300): number {
  return Math.max(limit, Math.min(1, Math.E ** (2.5 * numOfRetries)));
}

/**
 * This method uses an exponential function to get the amount
 * to delay by from the number of retries upto a specified limit,
 * then applies jitter to the delay generated.
 * @param numOfRetries the number of retries that have been attempted so far
 * @param limit Default 300 seconds. Limit in seconds that this function is allowed to produce.
 * @param variance a percentage that sets the size of the range of possibilities based off of the time attribute. Default is 0.1.
 */

export function getDelayWithJitter(
  numOfRetries,
  limit = 300,
  variance = 0.1
): number {
  const baseDelay = getDelay(numOfRetries, limit);

  return addJitter(baseDelay, variance);
}
