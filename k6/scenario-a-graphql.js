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

export default function () {

  const mutation = JSON.stringify({
    query: `mutation {
      ingestMeasurement(
        deviceId:         "SENSOR_ITALY_01"
        measurementTime:  "${new Date().toISOString()}"
        coGt:             2.6
        pt08S1Co:         1360
        nmhcGt:           150
        c6H6Gt:           11.9
        pt08S2Nmhc:       1046
        noxGt:            166
        pt08S3Nox:        1056
        no2Gt:            113
        pt08S4No2:        1692
        pt08S5O3:         1268
        temperature:      13.6
        relativeHumidity: 48.9
        absoluteHumidity: 0.7578
      ) {
        id
        deviceId
        measurementTime
      }
    }`
  });

  const res = http.post(BASE_URL, mutation, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status je 200':            r => r.status === 200,
    'nema GraphQL grešaka':     r => !JSON.parse(r.body).errors,
    'odgovor ima id':           r => JSON.parse(r.body).data?.ingestMeasurement?.id !== undefined,
    'latencija ispod 500ms':    r => r.timings.duration < 500,
  });

  sleep(0.1);
}