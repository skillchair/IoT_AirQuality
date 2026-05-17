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
    grpc_req_duration: ['p(95)<2000'],  // 95% zahteva ispod 2s
  },
};

// ─── GRPC KLIJENT ─────────────────────────────────────────────────────────────

const client = new grpc.Client();
client.load(['../grpc-api/Protos'], 'airquality.proto');

// ─── TEST ─────────────────────────────────────────────────────────────────────

export default function () {
  client.connect('localhost:8081', { plaintext: true });

  // Scenario A – upis novog merenja (simulacija IoT uređaja)
  const response = client.invoke('airquality.AirQualityService/IngestMeasurement', {
    device_id:         'SENSOR_ITALY_01',
    measurement_time:  new Date().toISOString(),
    co_gt:             2.6,
    pt08_s1_co:        1360,
    nmhc_gt:           150,
    c6h6_gt:           11.9,
    pt08_s2_nmhc:      1046,
    nox_gt:            166,
    pt08_s3_nox:       1056,
    no2_gt:            113,
    pt08_s4_no2:       1692,
    pt08_s5_o3:        1268,
    temperature:       13.6,
    relative_humidity: 48.9,
    absolute_humidity: 0.7578,
  });

  check(response, {
    'status je OK':   r => r && r.status === grpc.StatusOK,
    'odgovor ima id': r => r && r.message && r.message.id !== undefined,
  });

  client.close();
  sleep(0.1);
}