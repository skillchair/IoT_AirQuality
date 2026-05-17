using Microsoft.EntityFrameworkCore;
using AirQualityApi.Data;
using AirQualityGrpc.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();

builder.Services.AddDbContext<AirQualityDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.MapGrpcService<AirQualityService>();

app.Run();