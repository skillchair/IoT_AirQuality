import grpc from 'k6/net/grpc';
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
    grpc_req_duration: ['p(95)<2000'],
  },
};

// ─── GRPC KLIJENT ─────────────────────────────────────────────────────────────

const client = new grpc.Client();
client.load(['../grpc-api/Protos'], 'airquality.proto');

// ─── TEST ─────────────────────────────────────────────────────────────────────

export default function () {
  client.connect('localhost:8081', { plaintext: true });

  // Scenario B – gRPC uvek vraća sve kolone Protobuf poruke
  // Za razliku od GraphQL-a koji vraća samo tražena polja,
  // gRPC nema mehanizam za selektivno fetchovanje polja
  const response = client.invoke('airquality.AirQualityService/GetMeasurements', {
    page:      1,
    page_size: 10,
  });

  check(response, {
    'status je OK':  r => r && r.status === grpc.StatusOK,
    'ima merenja':   r => r && r.message && r.message.measurements && r.message.measurements.length > 0,
  });

  client.close();
  sleep(0.1);
}