using API.Data;
using API.DTOs;
using API.Hubs;
using API.Models;
using API.Tests.Helpers;
using Microsoft.AspNetCore.SignalR;
using Moq;

namespace API.Tests;

public class ChatHubDirectMessageTests : IAsyncLifetime
{
    private AppDbContext _db = null!;
    private Microsoft.AspNetCore.Identity.UserManager<AppUser> _userManager = null!;
    private AppUser _alice = null!;
    private AppUser _bob = null!;

    public async Task InitializeAsync()
    {
        _db = InMemoryDbFactory.Create("DirectMsgTests-" + Guid.NewGuid());
        _userManager = InMemoryDbFactory.CreateUserManager(_db);
        _alice = await InMemoryDbFactory.CreateUserAsync(_userManager, "alice2", "alice2@test.com");
        _bob = await InMemoryDbFactory.CreateUserAsync(_userManager, "bob2", "bob2@test.com");
    }

    public Task DisposeAsync()
    {
        _db.Dispose();
        _userManager.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task SendMessage_SavesMessageToDatabase()
    {
        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice2", _alice.Id);

        await hub.SendMessage(new MessageRequestDto { ReceiverId = _bob.Id, Content = "Hey Bob!" });

        Assert.Equal(1, _db.Messages.Count());
        var msg = _db.Messages.First();
        Assert.Equal("Hey Bob!", msg.Content);
        Assert.Equal(_bob.Id, msg.ReceiverId);
    }

    [Fact]
    public async Task SendMessage_NotifiesRecipientViaSignalR()
    {
        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice2", _alice.Id);

        await hub.SendMessage(new MessageRequestDto { ReceiverId = _bob.Id, Content = "Ping" });

        mockClients.Verify(c => c.User(_bob.Id), Times.Once());
    }

    [Fact]
    public async Task LoadMessages_ReturnsOnlyConversationMessages()
    {
        // Seed: alice→bob and bob→alice messages
        _db.Messages.AddRange(
            new Message { SenderId = _alice.Id, ReceiverId = _bob.Id, Content = "Hi", CreatedDate = DateTime.UtcNow.AddMinutes(-2) },
            new Message { SenderId = _bob.Id, ReceiverId = _alice.Id, Content = "Hello", CreatedDate = DateTime.UtcNow.AddMinutes(-1) }
        );
        // Unrelated message between two other users
        _db.Messages.Add(new Message { SenderId = "stranger1", ReceiverId = "stranger2", Content = "Other", CreatedDate = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice2", _alice.Id);

        List<MessageResponseDto>? received = null;
        var mockProxy = new Mock<IClientProxy>();
        mockProxy.Setup(p => p.SendCoreAsync("ReceiveMessageList", It.IsAny<object[]>(), default))
            .Callback<string, object[], CancellationToken>((_, args, _) =>
            {
                received = args[0] as List<MessageResponseDto>;
            })
            .Returns(Task.CompletedTask);
        mockClients.Setup(c => c.User(_alice.Id)).Returns(mockProxy.Object);

        await hub.LoadMessages(_bob.Id);

        Assert.NotNull(received);
        Assert.Equal(2, received.Count);
        Assert.All(received, m =>
            Assert.True(
                (m.SenderId == _alice.Id && m.ReceiverId == _bob.Id) ||
                (m.SenderId == _bob.Id && m.ReceiverId == _alice.Id)
            )
        );
    }

    [Fact]
    public async Task LoadMessages_MarksIncomingMessagesAsRead()
    {
        var msg = new Message
        {
            SenderId = _bob.Id,
            ReceiverId = _alice.Id,
            Content = "Unread",
            IsRead = false,
            CreatedDate = DateTime.UtcNow,
        };
        _db.Messages.Add(msg);
        await _db.SaveChangesAsync();

        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice2", _alice.Id);
        mockClients.Setup(c => c.User(It.IsAny<string>())).Returns(new Mock<IClientProxy>().Object);

        await hub.LoadMessages(_bob.Id);

        var updated = _db.Messages.First();
        Assert.True(updated.IsRead);
    }

    [Fact]
    public async Task OnConnectedAsync_AddsUserToOnlineUsers()
    {
        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice2", _alice.Id, "conn-alice");

        await hub.OnConnectedAsync();

        Assert.True(ChatHub.onlineUsers.ContainsKey("alice2"));
        ChatHub.onlineUsers.TryRemove("alice2", out _); // cleanup
    }

    [Fact]
    public async Task OnDisconnectedAsync_RemovesUserFromOnlineUsers()
    {
        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice2", _alice.Id, "conn-alice");

        await hub.OnConnectedAsync();
        await hub.OnDisconnectedAsync(null);

        Assert.False(ChatHub.onlineUsers.ContainsKey("alice2"));
    }
}
