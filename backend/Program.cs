using Novira.Backend.Models;

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

var users = new[]
{
    new UserDto(1, "Ava Johnson", "ava.johnson@novira.dev", "Product Designer", "Design", "Online"),
    new UserDto(2, "Noah Patel", "noah.patel@novira.dev", "Backend Engineer", "Platform", "Online"),
    new UserDto(3, "Mia Chen", "mia.chen@novira.dev", "Frontend Engineer", "Product", "Away"),
    new UserDto(4, "Ethan Brooks", "ethan.brooks@novira.dev", "QA Analyst", "Quality", "Offline"),
    new UserDto(5, "Sophia Martinez", "sophia.martinez@novira.dev", "Customer Success", "Support", "Online"),
    new UserDto(6, "Liam Turner", "liam.turner@novira.dev", "DevOps Engineer", "Platform", "Online")
};

app.MapGet("/", () => Results.Ok(new
{
    message = "NOVIRA API is running",
    usersEndpoint = "/api/users"
}));

app.MapGet("/api/users", () => Results.Ok(users));

app.Run();
