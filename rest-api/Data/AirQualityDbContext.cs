using Microsoft.EntityFrameworkCore;
using AirQualityApi.Models;

namespace AirQualityApi.Data;

public class AirQualityDbContext : DbContext
{
    public AirQualityDbContext(DbContextOptions<AirQualityDbContext> options)
        : base(options) { }

    public DbSet<AirQualityMeasurement> Measurements { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AirQualityMeasurement>(entity =>
        {
            entity.ToTable("air_quality_measurements");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DeviceId).HasColumnName("device_id");
            entity.Property(e => e.MeasurementTime).HasColumnName("measurement_time");
            entity.Property(e => e.CoGt).HasColumnName("co_gt");
            entity.Property(e => e.Pt08S1Co).HasColumnName("pt08_s1_co");
            entity.Property(e => e.NmhcGt).HasColumnName("nmhc_gt");
            entity.Property(e => e.C6H6Gt).HasColumnName("c6h6_gt");
            entity.Property(e => e.Pt08S2Nmhc).HasColumnName("pt08_s2_nmhc");
            entity.Property(e => e.NoxGt).HasColumnName("nox_gt");
            entity.Property(e => e.Pt08S3Nox).HasColumnName("pt08_s3_nox");
            entity.Property(e => e.No2Gt).HasColumnName("no2_gt");
            entity.Property(e => e.Pt08S4No2).HasColumnName("pt08_s4_no2");
            entity.Property(e => e.Pt08S5O3).HasColumnName("pt08_s5_o3");
            entity.Property(e => e.Temperature).HasColumnName("temperature");
            entity.Property(e => e.RelativeHumidity).HasColumnName("relative_humidity");
            entity.Property(e => e.AbsoluteHumidity).HasColumnName("absolute_humidity");
        });
    }
}