#!/usr/bin/env python3
"""
AirQuality CSV → PostgreSQL import skript
Pokretanje: python3 import_airquality.py
"""

import csv
import psycopg2
from datetime import datetime

# ─── KONFIGURACIJA ────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "database": "airqualitydb",
    "user":     "postgres",
    "password": "postgres",   # ← promeni ako je drugačija lozinka
}

CSV_PATH   = "./dataset/AirQuality.csv"
DEVICE_ID  = "SENSOR_ITALY_01"   # dataset nema device_id, dodajemo ručno
BATCH_SIZE = 500                  # INSERT u grupama radi brzine

# ─── HELPER FUNKCIJE ──────────────────────────────────────────────────────────

def parse_float(raw: str):
    """Konvertuje evropski decimalni format i -200 (greška senzora) u None."""
    if raw is None:
        return None
    cleaned = raw.strip().replace(",", ".")
    if cleaned == "" or cleaned == "-200" or cleaned == "-200.0":
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_timestamp(date_str: str, time_str: str):
    """
    Spaja Date (10/03/2004) i Time (18.00.00) u Python datetime objekat.
    """
    date_str = date_str.strip()
    time_str = time_str.strip()

    # vreme može biti "18.00.00" ili "18:00:00"
    time_str = time_str.replace(".", ":")

    try:
        return datetime.strptime(f"{date_str} {time_str}", "%d/%m/%Y %H:%M:%S")
    except ValueError as e:
        raise ValueError(f"Ne mogu da parseram datum/vreme: '{date_str}' / '{time_str}' → {e}")


def detect_delimiter(path: str) -> str:
    """Automatski detektuje delimiter CSV fajla (';' ili ',')."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        first_line = f.readline()
    if first_line.count(";") > first_line.count(","):
        return ";"
    return ","

# ─── GLAVNI IMPORT ────────────────────────────────────────────────────────────

INSERT_SQL = """
    INSERT INTO air_quality_measurements (
        device_id, measurement_time,
        co_gt, pt08_s1_co, nmhc_gt, c6h6_gt, pt08_s2_nmhc,
        nox_gt, pt08_s3_nox, no2_gt, pt08_s4_no2, pt08_s5_o3,
        temperature, relative_humidity, absolute_humidity
    ) VALUES (
        %s, %s,
        %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s,
        %s, %s, %s
    )
"""


def run_import():
    delimiter = detect_delimiter(CSV_PATH)
    print(f"✓ Detektovan delimiter: '{delimiter}'")

    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()
    print("✓ Konekcija na bazu uspešna")

    inserted    = 0
    skipped     = 0
    batch       = []

    with open(CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter=delimiter)

        # Prikaži stvarna zaglavlja da vidimo šta smo dobili
        print(f"✓ Kolone u CSV-u: {reader.fieldnames}")

        for row_num, row in enumerate(reader, start=2):  # start=2 (red 1 je header)

            # Preskoči redove sa praznim datumom ili vremenom
            date_raw = row.get("Date", "").strip()
            time_raw = row.get("Time", "").strip()
            if not date_raw or not time_raw:
                skipped += 1
                continue

            try:
                ts = parse_timestamp(date_raw, time_raw)
            except ValueError as e:
                print(f"  ⚠ Red {row_num} preskočen — {e}")
                skipped += 1
                continue

            record = (
                DEVICE_ID,
                ts,
                parse_float(row.get("CO(GT)")),
                parse_float(row.get("PT08.S1(CO)")),
                parse_float(row.get("NMHC(GT)")),
                parse_float(row.get("C6H6(GT)")),
                parse_float(row.get("PT08.S2(NMHC)")),
                parse_float(row.get("NOx(GT)")),
                parse_float(row.get("PT08.S3(NOx)")),
                parse_float(row.get("NO2(GT)")),
                parse_float(row.get("PT08.S4(NO2)")),
                parse_float(row.get("PT08.S5(O3)")),
                parse_float(row.get("T")),
                parse_float(row.get("RH")),
                parse_float(row.get("AH")),
            )
            batch.append(record)

            # Batch INSERT
            if len(batch) >= BATCH_SIZE:
                cur.executemany(INSERT_SQL, batch)
                conn.commit()
                inserted += len(batch)
                print(f"  → Upisano {inserted} redova...")
                batch = []

    # Ostatak
    if batch:
        cur.executemany(INSERT_SQL, batch)
        conn.commit()
        inserted += len(batch)

    cur.close()
    conn.close()

    print(f"\n{'─'*50}")
    print(f"✅ Import završen!")
    print(f"   Upisano:    {inserted} redova")
    print(f"   Preskočeno: {skipped} redova")
    print(f"{'─'*50}")


if __name__ == "__main__":
    run_import()