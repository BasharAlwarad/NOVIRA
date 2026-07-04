var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("frontend");

app.MapGet("/", () => Results.Ok(new
{
    message = "NOVIRA API is running"
}));

app.Run();
