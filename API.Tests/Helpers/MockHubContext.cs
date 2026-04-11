using Microsoft.AspNetCore.SignalR;
using Moq;
using System.Security.Claims;

namespace API.Tests.Helpers;

/// <summary>
/// Wires mock SignalR context objects onto a Hub instance via its settable properties.
/// </summary>
public static class MockHubContext
{
    public static (Mock<IHubCallerClients> Clients, Mock<IGroupManager> Groups, Mock<HubCallerContext> Context)
        SetupHub(Hub hub, string userName, string userId, string connectionId = "conn-1")
    {
        var mockClients = new Mock<IHubCallerClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        var mockGroups = new Mock<IGroupManager>();
        var mockContext = new Mock<HubCallerContext>();

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, userName),
            new(ClaimTypes.NameIdentifier, userId),
        };
        var identity = new ClaimsIdentity(claims, "mock");
        var principal = new ClaimsPrincipal(identity);

        mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
        mockContext.Setup(c => c.User).Returns(principal);

        // All client targets return the same proxy by default
        mockClients.Setup(c => c.All).Returns(mockClientProxy.Object);
        mockClients.Setup(c => c.Others).Returns(mockClientProxy.Object);
        mockClients.Setup(c => c.Caller).Returns(mockClientProxy.Object);
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
        mockClients.Setup(c => c.User(It.IsAny<string>())).Returns(mockClientProxy.Object);
        mockClients.Setup(c => c.Client(It.IsAny<string>())).Returns(mockClientProxy.Object);

        mockGroups.Setup(g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), default))
                  .Returns(Task.CompletedTask);

        hub.Clients = mockClients.Object;
        hub.Groups = mockGroups.Object;
        hub.Context = mockContext.Object;

        return (mockClients, mockGroups, mockContext);
    }
}
