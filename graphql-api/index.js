import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import pg from 'pg';

const { Pool } = pg;

// ─── DB KONEKCIJA ─────────────────────────────────────────────────────────────

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'airqualitydb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const typeDefs = `#graphql

  type Measurement {
    id:               ID!
    deviceId:         String!
    measurementTime:  String!

    coGt:             Float
    pt08S1Co:         Float
    nmhcGt:           Float
    c6H6Gt:           Float
    pt08S2Nmhc:       Float
    noxGt:            Float
    pt08S3Nox:        Float
    no2Gt:            Float
    pt08S4No2:        Float
    pt08S5O3:         Float

    temperature:      Float
    relativeHumidity: Float
    absoluteHumidity: Float
  }

  type MeasurementList {
    total:        Int!
    page:         Int!
    pageSize:     Int!
    measurements: [Measurement!]!
  }

  type AggregateResult {
    period:             String!
    count:              Int!
    avgTemperature:     Float
    avgRelativeHumidity: Float
    avgCoGt:            Float
    avgNoxGt:           Float
    avgNo2Gt:           Float
    minTemperature:     Float
    maxTemperature:     Float
  }

  type Query {
    # Jedno merenje po ID-u
    measurement(id: ID!): Measurement

    # Sva merenja sa filterom i paginacijom
    measurements(
      from:     String
      to:       String
      page:     Int
      pageSize: Int
    ): MeasurementList!

    # Merenja po uređaju
    measurementsByDevice(
      deviceId: String!
      from:     String
      to:       String
      page:     Int
      pageSize: Int
    ): MeasurementList!

    # Agregacije – Scenario C
    aggregates(
      from:     String
      to:       String
      deviceId: String
      groupBy:  String
    ): [AggregateResult!]!
  }

  type Mutation {
    # Upis merenja – Scenario A
    ingestMeasurement(
      deviceId:         String!
      measurementTime:  String!
      coGt:             Float
      pt08S1Co:         Float
      nmhcGt:           Float
      c6H6Gt:           Float
      pt08S2Nmhc:       Float
      noxGt:            Float
      pt08S3Nox:        Float
      no2Gt:            Float
      pt08S4No2:        Float
      pt08S5O3:         Float
      temperature:      Float
      relativeHumidity: Float
      absoluteHumidity: Float
    ): Measurement!
  }
`;

// ─── RESOLVERS ────────────────────────────────────────────────────────────────

const resolvers = {
  Query: {

    measurement: async (_, { id }) => {
      const res = await pool.query(
        'SELECT * FROM air_quality_measurements WHERE id = $1',
        [id]
      );
      return res.rows[0] ? mapRow(res.rows[0]) : null;
    },

    measurements: async (_, { from, to, page = 1, pageSize = 50 }) => {
      const conditions = [];
      const params     = [];

      if (from) { params.push(from); conditions.push(`measurement_time >= $${params.length}`); }
      if (to)   { params.push(to);   conditions.push(`measurement_time <= $${params.length}`); }

      const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const offset = (page - 1) * pageSize;

      const countRes = await pool.query(`SELECT COUNT(*) FROM air_quality_measurements ${where}`, params);
      const total    = parseInt(countRes.rows[0].count);

      params.push(pageSize); const limitIdx  = params.length;
      params.push(offset);   const offsetIdx = params.length;

      const dataRes = await pool.query(
        `SELECT * FROM air_quality_measurements ${where}
         ORDER BY measurement_time
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );

      return { total, page, pageSize, measurements: dataRes.rows.map(mapRow) };
    },

    measurementsByDevice: async (_, { deviceId, from, to, page = 1, pageSize = 50 }) => {
      const conditions = ['device_id = $1'];
      const params     = [deviceId];

      if (from) { params.push(from); conditions.push(`measurement_time >= $${params.length}`); }
      if (to)   { params.push(to);   conditions.push(`measurement_time <= $${params.length}`); }

      const where  = 'WHERE ' + conditions.join(' AND ');
      const offset = (page - 1) * pageSize;

      const countRes = await pool.query(`SELECT COUNT(*) FROM air_quality_measurements ${where}`, params);
      const total    = parseInt(countRes.rows[0].count);

      params.push(pageSize); const limitIdx  = params.length;
      params.push(offset);   const offsetIdx = params.length;

      const dataRes = await pool.query(
        `SELECT * FROM air_quality_measurements ${where}
         ORDER BY measurement_time
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );

      return { total, page, pageSize, measurements: dataRes.rows.map(mapRow) };
    },

    aggregates: async (_, { from, to, deviceId, groupBy = 'hour' }) => {
      const conditions = [];
      const params     = [];

      if (from)     { params.push(from);     conditions.push(`measurement_time >= $${params.length}`); }
      if (to)       { params.push(to);       conditions.push(`measurement_time <= $${params.length}`); }
      if (deviceId) { params.push(deviceId); conditions.push(`device_id = $${params.length}`); }

      const where     = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const truncUnit = groupBy === 'day' ? 'day' : 'hour';

      const res = await pool.query(
        `SELECT
           date_trunc('${truncUnit}', measurement_time) AS period,
           COUNT(*)                                     AS count,
           AVG(temperature)                             AS avg_temperature,
           AVG(relative_humidity)                       AS avg_relative_humidity,
           AVG(co_gt)                                   AS avg_co_gt,
           AVG(nox_gt)                                  AS avg_nox_gt,
           AVG(no2_gt)                                  AS avg_no2_gt,
           MIN(temperature)                             AS min_temperature,
           MAX(temperature)                             AS max_temperature
         FROM air_quality_measurements
         ${where}
         GROUP BY date_trunc('${truncUnit}', measurement_time)
         ORDER BY period`,
        params
      );

      return res.rows.map(r => ({
        period:              r.period,
        count:               parseInt(r.count),
        avgTemperature:      r.avg_temperature,
        avgRelativeHumidity: r.avg_relative_humidity,
        avgCoGt:             r.avg_co_gt,
        avgNoxGt:            r.avg_nox_gt,
        avgNo2Gt:            r.avg_no2_gt,
        minTemperature:      r.min_temperature,
        maxTemperature:      r.max_temperature,
      }));
    },
  },

  Mutation: {
    ingestMeasurement: async (_, args) => {
      const res = await pool.query(
        `INSERT INTO air_quality_measurements
           (device_id, measurement_time, co_gt, pt08_s1_co, nmhc_gt, c6h6_gt,
            pt08_s2_nmhc, nox_gt, pt08_s3_nox, no2_gt, pt08_s4_no2, pt08_s5_o3,
            temperature, relative_humidity, absolute_humidity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING *`,
        [
          args.deviceId, args.measurementTime,
          args.coGt, args.pt08S1Co, args.nmhcGt, args.c6H6Gt, args.pt08S2Nmhc,
          args.noxGt, args.pt08S3Nox, args.no2Gt, args.pt08S4No2, args.pt08S5O3,
          args.temperature, args.relativeHumidity, args.absoluteHumidity,
        ]
      );
      return mapRow(res.rows[0]);
    },
  },
};

// ─── HELPER ───────────────────────────────────────────────────────────────────

function mapRow(r) {
  return {
    id:               r.id,
    deviceId:         r.device_id,
    measurementTime:  r.measurement_time,
    coGt:             r.co_gt,
    pt08S1Co:         r.pt08_s1_co,
    nmhcGt:           r.nmhc_gt,
    c6H6Gt:           r.c6h6_gt,
    pt08S2Nmhc:       r.pt08_s2_nmhc,
    noxGt:            r.nox_gt,
    pt08S3Nox:        r.pt08_s3_nox,
    no2Gt:            r.no2_gt,
    pt08S4No2:        r.pt08_s4_no2,
    pt08S5O3:         r.pt08_s5_o3,
    temperature:      r.temperature,
    relativeHumidity: r.relative_humidity,
    absoluteHumidity: r.absolute_humidity,
  };
}

// ─── START ────────────────────────────────────────────────────────────────────

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: parseInt(process.env.PORT || '4000') },
});

console.log(`GraphQL API pokrenut na: ${url}`);