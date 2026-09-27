 using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace TutorPlatform.Hubs;

public class NameUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
}
