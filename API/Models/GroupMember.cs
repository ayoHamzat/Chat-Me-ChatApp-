namespace API.Models;

public class GroupMember
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime JoinedDate { get; set; }

    public ChatGroup? Group { get; set; }
    public AppUser? User { get; set; }
}
