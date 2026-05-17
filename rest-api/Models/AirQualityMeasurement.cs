namespace AirQualityApi.Models;

public class AirQualityMeasurement
{
    public long Id { get; set; }

    public string DeviceId { get; set; } = string.Empty;

    public DateTime MeasurementTime { get; set; }

    // Senzori - nullable jer dataset ima greske (-200 → null)
    public double? CoGt { get; set; }
    public double? Pt08S1Co { get; set; }
    public double? NmhcGt { get; set; }
    public double? C6H6Gt { get; set; }
    public double? Pt08S2Nmhc { get; set; }
    public double? NoxGt { get; set; }
    public double? Pt08S3Nox { get; set; }
    public double? No2Gt { get; set; }
    public double? Pt08S4No2 { get; set; }
    public double? Pt08S5O3 { get; set; }

    // Ambijentalni podaci
    public double? Temperature { get; set; }
    public double? RelativeHumidity { get; set; }
    public double? AbsoluteHumidity { get; set; }
}