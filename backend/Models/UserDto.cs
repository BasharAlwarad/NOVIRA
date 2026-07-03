namespace Novira.Backend.Models;

public record UserDto(
    int Id,
    string Name,
    string Email,
    string Role,
    string Department,
    string Status);
