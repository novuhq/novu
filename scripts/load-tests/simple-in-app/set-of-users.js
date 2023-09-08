import { check } from 'k6';
import http from 'k6/http';
// eslint-disable-next-line import/extensions
import { uuidv4, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const apiKey = 'ApiKey ' + __ENV.staging_api_token;

let users = [];

function setup() {
  for (let i = 0; i < 10000; i++) {
    users.push({
      subscriberId: uuidv4(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'email' + i + '@example.com',
    });
  }
}

// See https://k6.io/docs/using-k6/options
export const options = {
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': {
          loadZone: 'amazon:us:ashburn',
          percent: 100,
        },
      },
      apm: [],
    },
  },
  thresholds: {},
  scenarios: {
    scenario_in_app: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 500,
      gracefulStop: '30s',
      stages: [
        { target: 100, duration: '1m' },
        { target: 500, duration: '1m' },
        { target: 1000, duration: '10m' },
        { target: 200, duration: '1m' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenarioInApp',
    },
  },
};

export function scenarioInApp() {
  let response = http.post(
    'https://staging.api.novu.co/v1/events/trigger',
    JSON.stringify({
      name: 'only-in-app',
      to: [randomItem(users)],
      payload: { cta: 'test' },
    }),
    {
      headers: {
        Authorization: apiKey,
        'content-type': 'application/json',
      },
    }
  );

  check(response, { 'status equals 201': (res) => res.status.toString() === '201' });
}
