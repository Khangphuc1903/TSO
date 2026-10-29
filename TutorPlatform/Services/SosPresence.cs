using System.Collections.Concurrent;

namespace TutorPlatform.Services;

public static class SosPresence
{
    private static readonly ConcurrentDictionary<int, ConcurrentDictionary<string, byte>> Connections = new();

    public static void Connected(int userId, string connectionId)
    {
        Connections.GetOrAdd(userId, _ => new()).TryAdd(connectionId, 0);
    }

    public static void Disconnected(int userId, string connectionId)
    {
        if (!Connections.TryGetValue(userId, out var connections))
            return;

        connections.TryRemove(connectionId, out _);
        if (connections.IsEmpty)
            Connections.TryRemove(userId, out _);
    }

    public static bool IsOnline(int userId) =>
        Connections.TryGetValue(userId, out var connections) && !connections.IsEmpty;
}
