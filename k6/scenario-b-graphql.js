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
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
};

// ─── TEST ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:4000';

// Scenario B – klijent traži SAMO 2 polja od 15
// Ovo je ključna prednost GraphQL-a nad REST-om
const QUERY = JSON.stringify({
  query: `{
    measurements(page: 1, pageSize: 10) {
      measurements {
        temperature
        relativeHumidity
      }
    }
  }`
});

export default function () {

  const res = http.post(BASE_URL, QUERY, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status je 200':         r => r.status === 200,
    'nema GraphQL grešaka':  r => !JSON.parse(r.body).errors,
    'ima merenja':           r => JSON.parse(r.body).data.measurements.measurements.length > 0,
    'latencija ispod 500ms': r => r.timings.duration < 500,
  });

  sleep(0.1);
}