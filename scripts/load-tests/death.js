import { check } from 'k6';
import http from 'k6/http';

const apiKey = 'ApiKey ' + __ENV.staging_api_token;

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
      executor: 'ramping-vus',
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
    JSON.stringify({ name: 'only-in-app-digest', to: [{ subscriberId: '533' }], payload: { cta: 'test' } }),
    {
      headers: {
        Authorization: apiKey,
        'content-type': 'application/json',
      },
    }
  );

  check(response, { 'status equals 201': (res) => res.status.toString() === '201' });

  let response2 = http.post(
    'https://staging.api.novu.co/v1/events/trigger',
    JSON.stringify({ name: 'only-in-app', to: [{ subscriberId: '1' }], payload: { cta: 'test' } }),
    {
      headers: {
        Authorization: apiKey,
        'content-type': 'application/json',
      },
    }
  );

  check(response2, { 'status equals 201': (res) => res.status.toString() === '201' });
}
