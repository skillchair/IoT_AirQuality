using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AirQualityApi.Data;
using AirQualityApi.Models;

namespace AirQualityApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MeasurementsController : ControllerBase
{
    private readonly AirQualityDbContext _context;

    public MeasurementsController(AirQualityDbContext context)
    {
        _context = context;
    }

    // GET /api/measurements?from=&to=&page=&pageSize=
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.Measurements.AsQueryable();

        if (from.HasValue)
            query = query.Where(m => m.MeasurementTime >= from.Value);

        if (to.HasValue)
            query = query.Where(m => m.MeasurementTime <= to.Value);

        var total = await query.CountAsync();

        var data = await query
            .OrderBy(m => m.MeasurementTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, data });
    }

    // GET /api/measurements/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var measurement = await _context.Measurements.FindAsync(id);

        if (measurement is null)
            return NotFound();

        return Ok(measurement);
    }

    // GET /api/measurements/device/{deviceId}?from=&to=
    [HttpGet("device/{deviceId}")]
    public async Task<IActionResult> GetByDevice(
        string deviceId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.Measurements
            .Where(m => m.DeviceId == deviceId);

        if (from.HasValue)
            query = query.Where(m => m.MeasurementTime >= from.Value);

        if (to.HasValue)
            query = query.Where(m => m.MeasurementTime <= to.Value);

        var total = await query.CountAsync();

        var data = await query
            .OrderBy(m => m.MeasurementTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, data });
    }

    // GET /api/measurements/aggregate?from=&to=&deviceId=&groupBy=hour|day
    [HttpGet("aggregate")]
    public async Task<IActionResult> GetAggregate(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? deviceId,
        [FromQuery] string groupBy = "hour")
    {
        var query = _context.Measurements.AsQueryable();

        if (from.HasValue)
            query = query.Where(m => m.MeasurementTime >= from.Value.ToUniversalTime());

        if (to.HasValue)
            query = query.Where(m => m.MeasurementTime <= to.Value.ToUniversalTime());

        if (!string.IsNullOrEmpty(deviceId))
            query = query.Where(m => m.DeviceId == deviceId);

        var data = await query.ToListAsync();

        var grouped = groupBy.ToLower() == "day"
            ? data.GroupBy(m => m.MeasurementTime.Date)
            : data.GroupBy(m => new DateTime(
                m.MeasurementTime.Year,
                m.MeasurementTime.Month,
                m.MeasurementTime.Day,
                m.MeasurementTime.Hour, 0, 0));

        var result = grouped.Select(g => new
        {
            period = g.Key,
            count = g.Count(),
            avgTemperature = g.Average(m => m.Temperature),
            avgRelativeHumidity = g.Average(m => m.RelativeHumidity),
            avgCoGt = g.Where(m => m.CoGt.HasValue).Average(m => m.CoGt),
            avgNoxGt = g.Where(m => m.NoxGt.HasValue).Average(m => m.NoxGt),
            avgNo2Gt = g.Where(m => m.No2Gt.HasValue).Average(m => m.No2Gt),
            minTemperature = g.Min(m => m.Temperature),
            maxTemperature = g.Max(m => m.Temperature),
        })
        .OrderBy(g => g.period)
        .ToList();

        return Ok(result);
    }

    // POST /api/measurements
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AirQualityMeasurement measurement)
    {
        measurement.Id = 0; // BIGSERIAL - baza dodeljuje ID

        _context.Measurements.Add(measurement);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = measurement.Id }, measurement);
    }
}