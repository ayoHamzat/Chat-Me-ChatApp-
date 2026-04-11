using API.Data;
using API.DTOs;
using API.Hubs;
using API.Models;
using API.Tests.Helpers;
using Microsoft.AspNetCore.SignalR;
using Moq;

namespace API.Tests;

public class ChatHubGroupTests : IAsyncLifetime
{
    private AppDbContext _db = null!;
    private Microsoft.AspNetCore.Identity.UserManager<AppUser> _userManager = null!;
    private AppUser _alice = null!;
    private AppUser _bob = null!;

    public async Task InitializeAsync()
    {
        _db = InMemoryDbFactory.Create("GroupTests-" + Guid.NewGuid());
        _userManager = InMemoryDbFactory.CreateUserManager(_db);

        _alice = await InMemoryDbFactory.CreateUserAsync(_userManager, "alice", "alice@test.com");
        _alice.FullName = "Alice Smith";

        _bob = await InMemoryDbFactory.CreateUserAsync(_userManager, "bob", "bob@test.com");
        _bob.FullName = "Bob Jones";
    }

    public Task DisposeAsync()
    {
        _db.Dispose();
        _userManager.Dispose();
        return Task.CompletedTask;
    }

    // --- CreateGroup ---

    [Fact]
    public async Task CreateGroup_CreatesGroupAndAddsMembersInDb()
    {
        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice", _alice.Id);

        var dto = new CreateGroupDto { Name = "Dev Team", MemberIds = [_bob.Id] };
        await hub.CreateGroup(dto);

        Assert.Equal(1, _db.ChatGroups.Count());
        Assert.Equal("Dev Team", _db.ChatGroups.First().Name);
        Assert.Equal(2, _db.GroupMembers.Count()); // alice + bob
    }

    [Fact]
    public async Task CreateGroup_CreatorIsAlwaysIncludedAsMember()
    {
        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice", _alice.Id);

        // Only bob in MemberIds — alice (creator) should be auto-added
        await hub.CreateGroup(new CreateGroupDto { Name = "Team", MemberIds = [_bob.Id] });

        var members = _db.GroupMembers.Select(m => m.UserId).ToList();
        Assert.Contains(_alice.Id, members);
        Assert.Contains(_bob.Id, members);
    }

    [Fact]
    public async Task CreateGroup_BroadcastsGroupCreatedToAllMembers()
    {
        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice", _alice.Id);

        await hub.CreateGroup(new CreateGroupDto { Name = "Announce", MemberIds = [_bob.Id] });

        // GroupCreated is sent via Clients.User(memberId) for each member
        mockClients.Verify(c => c.User(It.IsAny<string>()), Times.AtLeastOnce());
    }

    [Fact]
    public async Task CreateGroup_DeduplicatesMemberIds()
    {
        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice", _alice.Id);

        // alice is both creator and in the list — should not be duplicated
        await hub.CreateGroup(new CreateGroupDto { Name = "Dupe Test", MemberIds = [_alice.Id, _bob.Id] });

        Assert.Equal(2, _db.GroupMembers.Count());
    }

    // --- SendGroupMessage ---

    [Fact]
    public async Task SendGroupMessage_SavesMessageToDatabase()
    {
        // Arrange: create a group with alice and bob
        var group = await CreateTestGroupAsync("Test Group");

        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice", _alice.Id);

        await hub.SendGroupMessage(group.Id, "Hello everyone!");

        Assert.Equal(1, _db.GroupMessages.Count());
        var msg = _db.GroupMessages.First();
        Assert.Equal("Hello everyone!", msg.Content);
        Assert.Equal(_alice.Id, msg.SenderId);
        Assert.Equal(group.Id, msg.GroupId);
    }

    [Fact]
    public async Task SendGroupMessage_BroadcastsToSignalRGroup()
    {
        var group = await CreateTestGroupAsync("Broadcast Group");

        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice", _alice.Id);

        await hub.SendGroupMessage(group.Id, "Test broadcast");

        mockClients.Verify(c => c.Group($"group_{group.Id}"), Times.Once());
    }

    [Fact]
    public async Task SendGroupMessage_NonMemberCannotSendMessage()
    {
        var group = await CreateTestGroupAsync("Members Only", includeAlice: false);

        var hub = new ChatHub(_userManager, _db);
        MockHubContext.SetupHub(hub, "alice", _alice.Id);

        // alice is NOT a member of this group
        await hub.SendGroupMessage(group.Id, "Should be blocked");

        Assert.Equal(0, _db.GroupMessages.Count());
    }

    [Fact]
    public async Task SendGroupMessage_IncludesSenderInfoInDto()
    {
        var group = await CreateTestGroupAsync("Info Group");

        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice", _alice.Id);

        GroupMessageDto? capturedDto = null;
        var mockProxy = new Mock<IClientProxy>();
        mockProxy.Setup(p => p.SendCoreAsync(
            "ReceiveGroupMessage",
            It.IsAny<object[]>(),
            default
        )).Callback<string, object[], CancellationToken>((_, args, _) =>
        {
            capturedDto = args[0] as GroupMessageDto;
        }).Returns(Task.CompletedTask);

        mockClients.Setup(c => c.Group($"group_{group.Id}")).Returns(mockProxy.Object);

        await hub.SendGroupMessage(group.Id, "Hi from Alice");

        Assert.NotNull(capturedDto);
        Assert.Equal(_alice.Id, capturedDto.SenderId);
        Assert.Equal("Alice Smith", capturedDto.SenderName);
    }

    // --- LoadGroupMessages ---

    [Fact]
    public async Task LoadGroupMessages_ReturnsPaginatedMessages()
    {
        var group = await CreateTestGroupAsync("Paged Group");

        // Seed 25 messages
        for (int i = 1; i <= 25; i++)
        {
            _db.GroupMessages.Add(new GroupMessage
            {
                GroupId = group.Id,
                SenderId = _alice.Id,
                Content = $"Message {i}",
                CreatedDate = DateTime.UtcNow.AddMinutes(-25 + i),
            });
        }
        await _db.SaveChangesAsync();

        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice", _alice.Id);

        List<GroupMessageDto>? page1 = null;
        var mockProxy = new Mock<IClientProxy>();
        mockProxy.Setup(p => p.SendCoreAsync("ReceiveGroupMessageList", It.IsAny<object[]>(), default))
            .Callback<string, object[], CancellationToken>((_, args, _) =>
            {
                page1 = args[0] as List<GroupMessageDto>;
            })
            .Returns(Task.CompletedTask);
        mockClients.Setup(c => c.Caller).Returns(mockProxy.Object);

        await hub.LoadGroupMessages(group.Id, pageNumber: 1);

        Assert.NotNull(page1);
        Assert.Equal(20, page1.Count); // page size is 20
    }

    [Fact]
    public async Task LoadGroupMessages_NonMemberGetsNoMessages()
    {
        var group = await CreateTestGroupAsync("Private", includeAlice: false);
        _db.GroupMessages.Add(new GroupMessage
        {
            GroupId = group.Id,
            SenderId = _bob.Id,
            Content = "Secret",
            CreatedDate = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var hub = new ChatHub(_userManager, _db);
        var (mockClients, _, _) = MockHubContext.SetupHub(hub, "alice", _alice.Id);

        var callerProxy = new Mock<IClientProxy>();
        mockClients.Setup(c => c.Caller).Returns(callerProxy.Object);

        await hub.LoadGroupMessages(group.Id);

        callerProxy.Verify(p => p.SendCoreAsync(
            "ReceiveGroupMessageList", It.IsAny<object[]>(), default), Times.Never());
    }

    // --- Helpers ---

    private async Task<ChatGroup> CreateTestGroupAsync(string name, bool includeAlice = true)
    {
        var group = new ChatGroup
        {
            Name = name,
            CreatedById = _bob.Id,
            CreatedDate = DateTime.UtcNow,
        };
        _db.ChatGroups.Add(group);
        await _db.SaveChangesAsync();

        if (includeAlice)
            _db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = _alice.Id, JoinedDate = DateTime.UtcNow });

        _db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = _bob.Id, JoinedDate = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        return group;
    }
}
