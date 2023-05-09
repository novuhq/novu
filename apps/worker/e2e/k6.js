import { sleep } from 'k6'
import http from 'k6/http'

// See https://k6.io/docs/using-k6/options
export const options = {
  ext: {
    loadimpact: {
      distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
      apm: [],
    },
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 1000, duration: '1m' },
        { target: 2000, duration: '5m' },
        { target: 1000, duration: '1m' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
  },
};

export function scenario_1() {
  let response = http.post(
    'https://dev.api.novu.co/v1/events/trigger',
    '{\n           "name": "delay2",\n    "to": [     "devtestsubscriber", "63ecef7733a6d6fa31280a6d"    ],\n    "payload": {"name":"test"}\n  }',
    {
      headers: {
        Authorization: 'ApiKey e3ecb77b482d2ac5caa366bfc26601b7',
        'content-type': 'application/json',
      },
    }
  );
  sleep(1);
}
