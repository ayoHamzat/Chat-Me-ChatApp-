using System;
using System.Collections.Concurrent;
using API.Data;
using API.DTOs;
using API.Extenions;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API.Hubs;

[Authorize]
public class ChatHub(UserManager<AppUser> userManager, AppDbContext context) : Hub
{

    public static readonly ConcurrentDictionary<string, OnlineUserDto> onlineUsers = new();


    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var recevierId = httpContext?.Request.Query["senderId"].ToString();
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);
        var connectionId = Context.ConnectionId;

        if (onlineUsers.ContainsKey(userName))
        {
            onlineUsers[userName].ConnectionId = connectionId;
        }
        else
        {
            var user = new OnlineUserDto
            {
                ConnectionId = connectionId,
                UserName = userName,
                ProfilePicture = currentUser!.ProfileImage,
                FullName = currentUser!.FullName
            };

            onlineUsers.TryAdd(userName, user);

            await Clients.Others.SendAsync("Notify", currentUser);
        }

        // Join SignalR groups for all of the user's group memberships
        var userGroupIds = await context.GroupMembers
            .Where(gm => gm.UserId == currentUser!.Id)
            .Select(gm => gm.GroupId)
            .ToListAsync();

        foreach (var groupId in userGroupIds)
        {
            await Groups.AddToGroupAsync(connectionId, $"group_{groupId}");
        }

        if (!string.IsNullOrEmpty(recevierId))
        {
            await LoadMessages(recevierId);
        }

        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());

        // Send this user's groups
        var userGroups = await GetUserGroupsAsync(currentUser!.Id);
        await Clients.Caller.SendAsync("UserGroups", userGroups);
    }

    public async Task LoadMessages(string recipientId, int pageNumber = 1)
    {

        int pageSize = 10;
        var username = Context.User!.Identity!.Name;
        var currentUser = await userManager.FindByNameAsync(username!);

        if (currentUser is null)
        {
            return;
        }

        List<MessageResponseDto> messages = await context.Messages
        .Where(x => x.ReceiverId == currentUser!.Id && x.SenderId == recipientId || x.SenderId == currentUser!.Id && x.ReceiverId == recipientId)
        .OrderByDescending(x => x.CreatedDate)
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .OrderBy(x => x.CreatedDate)
        .Select(x => new MessageResponseDto
        {
            Id = x.Id,
            Content = x.Content,
            CreatedDate = x.CreatedDate,
            ReceiverId = x.ReceiverId,
            SenderId = x.SenderId
        })
        .ToListAsync();


        foreach (var message in messages)
        {
            var msg = await context.Messages.FirstOrDefaultAsync(x => x.Id == message.Id);

            if (msg != null && msg.ReceiverId == currentUser.Id)
            {
                msg.IsRead = true;
                await context.SaveChangesAsync();
            }
        }

        await Task.Delay(1000);
        await Clients.User(currentUser.Id)
        .SendAsync("ReceiveMessageList", messages);
    }

    public async Task SendMessage(MessageRequestDto message)
    {
        var senderId = Context.User!.Identity!.Name;
        var recipientId = message.ReceiverId;

        var newMsg = new Message
        {
            Sender = await userManager.FindByNameAsync(senderId!),
            Receiver = await userManager.FindByIdAsync(recipientId!),
            IsRead = false,
            CreatedDate = DateTime.UtcNow,
            Content = message.Content
        };

        context.Messages.Add(newMsg);
        await context.SaveChangesAsync();

        await Clients.User(recipientId!).SendAsync("ReceiveNewMessage", newMsg);
    }

    public async Task NotifyTyping(string recipientUserName)
    {
        var senderUserName = Context.User!.Identity!.Name;

        if (senderUserName is null)
        {
            return;
        }

        var connectionId = onlineUsers.Values.FirstOrDefault(x => x.UserName == recipientUserName)?.ConnectionId;

        if (connectionId != null)
        {
            await Clients.Client(connectionId).SendAsync("NotifyTypingToUser", senderUserName);
        }
    }

    // --- Group Chat Methods ---

    public async Task CreateGroup(CreateGroupDto dto)
    {
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);
        if (currentUser is null) return;

        var group = new ChatGroup
        {
            Name = dto.Name,
            CreatedById = currentUser.Id,
            CreatedDate = DateTime.UtcNow,
        };
        context.ChatGroups.Add(group);
        await context.SaveChangesAsync();

        // Include creator in member list
        var allMemberIds = dto.MemberIds
            .Append(currentUser.Id)
            .Distinct()
            .ToList();

        foreach (var memberId in allMemberIds)
        {
            context.GroupMembers.Add(new GroupMember
            {
                GroupId = group.Id,
                UserId = memberId,
                JoinedDate = DateTime.UtcNow,
            });
        }
        await context.SaveChangesAsync();

        // Add all online members to the SignalR group and notify them
        foreach (var memberId in allMemberIds)
        {
            var memberUser = await userManager.FindByIdAsync(memberId);
            if (memberUser is null) continue;

            if (onlineUsers.TryGetValue(memberUser.UserName!, out var onlineUser) && onlineUser.ConnectionId != null)
            {
                await Groups.AddToGroupAsync(onlineUser.ConnectionId, $"group_{group.Id}");
            }

            var memberGroupDto = await GetGroupDtoAsync(group.Id, memberId);
            await Clients.User(memberId).SendAsync("GroupCreated", memberGroupDto);
        }
    }

    public async Task SendGroupMessage(int groupId, string content)
    {
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);
        if (currentUser is null) return;

        var isMember = await context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUser.Id);
        if (!isMember) return;

        var message = new GroupMessage
        {
            GroupId = groupId,
            SenderId = currentUser.Id,
            Content = content,
            CreatedDate = DateTime.UtcNow,
            IsRead = false,
        };
        context.GroupMessages.Add(message);
        await context.SaveChangesAsync();

        var messageDto = new GroupMessageDto
        {
            Id = message.Id,
            GroupId = groupId,
            SenderId = currentUser.Id,
            SenderName = currentUser.FullName ?? userName,
            SenderProfilePicture = currentUser.ProfileImage ?? string.Empty,
            Content = content,
            CreatedDate = message.CreatedDate,
            IsRead = false,
        };

        await Clients.Group($"group_{groupId}").SendAsync("ReceiveGroupMessage", messageDto);
    }

    public async Task LoadGroupMessages(int groupId, int pageNumber = 1)
    {
        var userName = Context.User!.Identity!.Name!;
        var currentUser = await userManager.FindByNameAsync(userName);
        if (currentUser is null) return;

        var isMember = await context.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == currentUser.Id);
        if (!isMember) return;

        int pageSize = 20;
        var messages = await context.GroupMessages
            .Where(m => m.GroupId == groupId)
            .OrderByDescending(m => m.CreatedDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .OrderBy(m => m.CreatedDate)
            .Include(m => m.Sender)
            .Select(m => new GroupMessageDto
            {
                Id = m.Id,
                GroupId = m.GroupId,
                SenderId = m.SenderId,
                SenderName = m.Sender!.FullName ?? m.Sender.UserName!,
                SenderProfilePicture = m.Sender.ProfileImage ?? string.Empty,
                Content = m.Content,
                CreatedDate = m.CreatedDate,
                IsRead = true,
            })
            .ToListAsync();

        await Clients.Caller.SendAsync("ReceiveGroupMessageList", messages);
    }

    // --- Disconnect ---

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var username = Context.User!.Identity!.Name;
        onlineUsers.TryRemove(username!, out _);
        await Clients.All.SendAsync("OnlineUsers", await GetAllUsers());
    }

    // --- Helpers ---

    private async Task<IEnumerable<OnlineUserDto>> GetAllUsers()
    {
        var username = Context.User!.GetUserName();

        var onlineUsersSet = new HashSet<string>(onlineUsers.Keys);

        var currentUserId = (await userManager.FindByNameAsync(username!))?.Id ?? "";

        var users = await userManager.Users.Select(u => new OnlineUserDto
        {
            Id = u.Id,
            UserName = u.UserName,
            FullName = u.FullName,
            ProfilePicture = u.ProfileImage,
            IsOnline = onlineUsersSet.Contains(u.UserName!),
            UnreadCount = context.Messages.Count(x => x.ReceiverId == currentUserId && x.SenderId == u.Id && !x.IsRead),
            HasHistory = context.Messages.Any(x =>
                (x.SenderId == currentUserId && x.ReceiverId == u.Id) ||
                (x.SenderId == u.Id && x.ReceiverId == currentUserId))
        }).OrderByDescending(u => u.IsOnline)
        .ToListAsync();

        return users;
    }

    private async Task<GroupDto> GetGroupDtoAsync(int groupId, string userId)
    {
        var group = await context.ChatGroups
            .Include(g => g.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group is null) return new GroupDto();

        var unreadCount = await context.GroupMessages
            .CountAsync(m => m.GroupId == groupId && !m.IsRead && m.SenderId != userId);

        return new GroupDto
        {
            Id = group.Id,
            Name = group.Name,
            MemberIds = group.Members.Select(m => m.UserId).ToList(),
            MemberNames = group.Members.Select(m => m.User?.FullName ?? m.User?.UserName ?? string.Empty).ToList(),
            UnreadCount = unreadCount,
            HasHistory = await context.GroupMessages.AnyAsync(m => m.GroupId == groupId),
        };
    }

    private async Task<List<GroupDto>> GetUserGroupsAsync(string userId)
    {
        var groupIds = await context.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Select(gm => gm.GroupId)
            .ToListAsync();

        var result = new List<GroupDto>();
        foreach (var groupId in groupIds)
        {
            result.Add(await GetGroupDtoAsync(groupId, userId));
        }
        return result;
    }
}
