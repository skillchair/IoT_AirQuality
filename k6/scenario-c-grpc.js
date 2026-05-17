import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';

// ─── KONFIGURACIJA ────────────────────────────────────────────────────────────

export const options = {
  stages: [
    { duration: '30s', target: 10  },  // ramp-up do 10 VU
    { duration: '30s', target: 10  },  // drži 10 VU
    { duration: '30s', target: 100 },  // ramp-up do 100 VU
    { duration: '30s', target: 100 },  // drži 100 VU
    { duration: '30s', target: 500 },  // ramp-up do 500 VU
    { duration: '30s', target: 500 },  // drži 500 VU
    { duration: '15s', target: 0   },  // ramp-down
  ],
  thresholds: {
    grpc_req_duration: ['p(95)<5000'],  // agregacije su sporije, prag 5s
  },
};

// ─── GRPC KLIJENT ─────────────────────────────────────────────────────────────

const client = new grpc.Client();
client.load(['../grpc-api/Protos'], 'airquality.proto');

// ─── TEST ─────────────────────────────────────────────────────────────────────

export default function () {
  client.connect('localhost:8081', { plaintext: true });

  // Scenario C – agregacije nad godinom podataka grupisane po satu
  const response = client.invoke('airquality.AirQualityService/GetAggregates', {
    from:     '2004-03-10T00:00:00Z',
    to:       '2004-12-30T00:00:00Z',
    group_by: 'hour',
  });

  check(response, {
    'status je OK':  r => r && r.status === grpc.StatusOK,
    'ima rezultata': r => r && r.message && r.message.results && r.message.results.length > 0,
  });

  client.close();
  sleep(0.1);
}