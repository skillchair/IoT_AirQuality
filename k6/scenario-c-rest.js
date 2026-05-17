import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── KONFIGURACIJA ────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '30s', target: 10  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 500 },
    { duration: '15s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // agregacije su sporije, prag 5s
    http_req_failed:   ['rate<0.05'],
  },
};

// ─── TEST ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:8080';

export default function () {

  const res = http.get(
    `${BASE_URL}/api/measurements/aggregate?from=2004-03-10T00:00:00&to=2004-12-30T00:00:00&groupBy=hour`,
  );

  check(res, {
    'status je 200':         r => r.status === 200,
    'ima rezultata':         r => JSON.parse(r.body).length > 0,
    'latencija ispod 2000ms': r => r.timings.duration < 2000,
  });

  sleep(0.1);
}