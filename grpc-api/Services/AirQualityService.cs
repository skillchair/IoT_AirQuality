using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using AirQualityGrpc;
using AirQualityApi.Data;

namespace AirQualityGrpc.Services;

public class AirQualityService : AirQualityGrpc.AirQualityService.AirQualityServiceBase
{
    private readonly AirQualityDbContext _context;

    public AirQualityService(AirQualityDbContext context)
    {
        _context = context;
    }

    // ─── INGEST (Scenario A) ─────────────────────────────────────────────────

    public override async Task<IngestMeasurementResponse> IngestMeasurement(
        IngestMeasurementRequest request, ServerCallContext context)
    {
        var measurement = new AirQualityApi.Models.AirQualityMeasurement
        {
            DeviceId = request.DeviceId,
            MeasurementTime = DateTime.Parse(request.MeasurementTime).ToUniversalTime(),
            CoGt = request.CoGt,
            Pt08S1Co = request.Pt08S1Co,
            NmhcGt = request.NmhcGt,
            C6H6Gt = request.C6H6Gt,
            Pt08S2Nmhc = request.Pt08S2Nmhc,
            NoxGt = request.NoxGt,
            Pt08S3Nox = request.Pt08S3Nox,
            No2Gt = request.No2Gt,
            Pt08S4No2 = request.Pt08S4No2,
            Pt08S5O3 = request.Pt08S5O3,
            Temperature = request.Temperature,
            RelativeHumidity = request.RelativeHumidity,
            AbsoluteHumidity = request.AbsoluteHumidity,
        };

        _context.Measurements.Add(measurement);
        await _context.SaveChangesAsync();

        return new IngestMeasurementResponse { Id = measurement.Id, Success = true };
    }

    // ─── GET BY ID ───────────────────────────────────────────────────────────

    public override async Task<MeasurementResponse> GetMeasurementById(
        GetByIdRequest request, ServerCallContext context)
    {
        var m = await _context.Measurements.FindAsync(request.Id);

        if (m is null)
            return new MeasurementResponse { Found = false };

        return new MeasurementResponse { Found = true, Measurement = MapToProto(m) };
    }

    // ─── GET ALL ─────────────────────────────────────────────────────────────

    public override async Task<MeasurementListResponse> GetMeasurements(
        GetMeasurementsRequest request, ServerCallContext context)
    {
        var query = _context.Measurements.AsQueryable();

        if (!string.IsNullOrEmpty(request.From))
            query = query.Where(m => m.MeasurementTime >= DateTime.Parse(request.From));

        if (!string.IsNullOrEmpty(request.To))
            query = query.Where(m => m.MeasurementTime <= DateTime.Parse(request.To));

        var total = await query.CountAsync();
        var page = request.Page < 1 ? 1 : request.Page;
        var size = request.PageSize < 1 ? 50 : request.PageSize;

        var data = await query
            .OrderBy(m => m.MeasurementTime)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();

        var response = new MeasurementListResponse
        {
            Total = total,
            Page = page,
            PageSize = size,
        };
        response.Measurements.AddRange(data.Select(MapToProto));

        return response;
    }

    // ─── GET BY DEVICE ───────────────────────────────────────────────────────

    public override async Task<MeasurementListResponse> GetByDevice(
        GetByDeviceRequest request, ServerCallContext context)
    {
        var query = _context.Measurements
            .Where(m => m.DeviceId == request.DeviceId);

        if (!string.IsNullOrEmpty(request.From))
            query = query.Where(m => m.MeasurementTime >= DateTime.Parse(request.From));

        if (!string.IsNullOrEmpty(request.To))
            query = query.Where(m => m.MeasurementTime <= DateTime.Parse(request.To));

        var total = await query.CountAsync();
        var page = request.Page < 1 ? 1 : request.Page;
        var size = request.PageSize < 1 ? 50 : request.PageSize;

        var data = await query
            .OrderBy(m => m.MeasurementTime)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync();

        var response = new MeasurementListResponse
        {
            Total = total,
            Page = page,
            PageSize = size,
        };
        response.Measurements.AddRange(data.Select(MapToProto));

        return response;
    }

    // ─── AGGREGATE (Scenario C) ──────────────────────────────────────────────

    public override async Task<AggregateListResponse> GetAggregates(
        AggregateRequest request, ServerCallContext context)
    {
        var query = _context.Measurements.AsQueryable();

        if (!string.IsNullOrEmpty(request.From))
            query = query.Where(m => m.MeasurementTime >= DateTime.Parse(request.From).ToUniversalTime());

        if (!string.IsNullOrEmpty(request.To))
            query = query.Where(m => m.MeasurementTime <= DateTime.Parse(request.To).ToUniversalTime());

        if (!string.IsNullOrEmpty(request.DeviceId))
            query = query.Where(m => m.DeviceId == request.DeviceId);

        var data = await query.ToListAsync();
        var groupBy = request.GroupBy?.ToLower() == "day" ? "day" : "hour";

        var grouped = groupBy == "day"
            ? data.GroupBy(m => m.MeasurementTime.Date)
            : data.GroupBy(m => new DateTime(
                m.MeasurementTime.Year,
                m.MeasurementTime.Month,
                m.MeasurementTime.Day,
                m.MeasurementTime.Hour, 0, 0));

        var response = new AggregateListResponse();

        response.Results.AddRange(grouped.Select(g => new AggregateResult
        {
            Period = g.Key.ToString("o"),
            Count = g.Count(),
            AvgTemperature = g.Average(m => m.Temperature) ?? 0,
            AvgRelativeHumidity = g.Average(m => m.RelativeHumidity) ?? 0,
            AvgCoGt = g.Where(m => m.CoGt.HasValue).Average(m => m.CoGt) ?? 0,
            AvgNoxGt = g.Where(m => m.NoxGt.HasValue).Average(m => m.NoxGt) ?? 0,
            AvgNo2Gt = g.Where(m => m.No2Gt.HasValue).Average(m => m.No2Gt) ?? 0,
            MinTemperature = g.Min(m => m.Temperature) ?? 0,
            MaxTemperature = g.Max(m => m.Temperature) ?? 0,
        }).OrderBy(r => r.Period));

        return response;
    }

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private static Measurement MapToProto(AirQualityApi.Models.AirQualityMeasurement m) =>
        new Measurement
        {
            Id = m.Id,
            DeviceId = m.DeviceId,
            MeasurementTime = m.MeasurementTime.ToString("o"),
            CoGt = m.CoGt ?? 0,
            Pt08S1Co = m.Pt08S1Co ?? 0,
            NmhcGt = m.NmhcGt ?? 0,
            C6H6Gt = m.C6H6Gt ?? 0,
            Pt08S2Nmhc = m.Pt08S2Nmhc ?? 0,
            NoxGt = m.NoxGt ?? 0,
            Pt08S3Nox = m.Pt08S3Nox ?? 0,
            No2Gt = m.No2Gt ?? 0,
            Pt08S4No2 = m.Pt08S4No2 ?? 0,
            Pt08S5O3 = m.Pt08S5O3 ?? 0,
            Temperature = m.Temperature ?? 0,
            RelativeHumidity = m.RelativeHumidity ?? 0,
            AbsoluteHumidity = m.AbsoluteHumidity ?? 0,
        };
}