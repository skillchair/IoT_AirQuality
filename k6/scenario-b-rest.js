import http from 'k6/http';
import { check, sleep } from 'k6';

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
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:8080';

export default function () {
  const res = http.get(`${BASE_URL}/api/measurements?pageSize=10`);

  check(res, {
    'status je 200':         r => r.status === 200,
    'ima podataka':          r => JSON.parse(r.body).data.length > 0,
    'latencija ispod 500ms': r => r.timings.duration < 500,
  });

  sleep(0.1);
}