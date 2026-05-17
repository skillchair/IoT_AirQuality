CREATE TABLE air_quality_measurements (
    id BIGSERIAL PRIMARY KEY,

    device_id VARCHAR(50) NOT NULL,

    measurement_time TIMESTAMP NOT NULL,

    co_gt DOUBLE PRECISION,
    pt08_s1_co DOUBLE PRECISION,
    nmhc_gt DOUBLE PRECISION,
    c6h6_gt DOUBLE PRECISION,
    pt08_s2_nmhc DOUBLE PRECISION,
    nox_gt DOUBLE PRECISION,
    pt08_s3_nox DOUBLE PRECISION,
    no2_gt DOUBLE PRECISION,
    pt08_s4_no2 DOUBLE PRECISION,
    pt08_s5_o3 DOUBLE PRECISION,

    temperature DOUBLE PRECISION,
    relative_humidity DOUBLE PRECISION,
    absolute_humidity DOUBLE PRECISION
);

-- ključni IoT indeksi

CREATE INDEX idx_measurement_time
ON air_quality_measurements(measurement_time);

CREATE INDEX idx_device_time
ON air_quality_measurements(device_id, measurement_time);
