import http from 'k6/http';
import { check, sleep } from 'k6';

// ─── KONFIGURACIJA ────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp-up do 10 VU
    { duration: '30s', target: 10  },  // drzi 10 VU
    { duration: '30s', target: 100 },  // ramp-up do 100 VU
    { duration: '30s', target: 100 },  // drzi 100 VU
    { duration: '30s', target: 500 },  // ramp-up do 500 VU
    { duration: '30s', target: 500 },  // drzi 500 VU
    { duration: '15s', target: 0   },  // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% zahteva ispod 2s
    http_req_failed:   ['rate<0.05'],   // manje od 5% gresaka
  },
};

// ─── TEST ─────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:8080';

export default function () {

  // Svaki VU salje jedno merenje
  const payload = JSON.stringify({
    deviceId:         'SENSOR_ITALY_01',
    measurementTime:  new Date().toISOString(),
    coGt:             2.6,
    pt08S1Co:         1360,
    nmhcGt:           150,
    c6H6Gt:           11.9,
    pt08S2Nmhc:       1046,
    noxGt:            166,
    pt08S3Nox:        1056,
    no2Gt:            113,
    pt08S4No2:        1692,
    pt08S5O3:         1268,
    temperature:      13.6,
    relativeHumidity: 48.9,
    absoluteHumidity: 0.7578,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/measurements`, payload, params);

  // Provera da li je odgovor ispravan
  check(res, {
    'status je 201':             r => r.status === 201,
    'odgovor ima id':            r => JSON.parse(r.body).id !== undefined,
    'latencija ispod 500ms':     r => r.timings.duration < 500,
  });

  sleep(0.1); // 100ms pauza između zahteva po VU
}