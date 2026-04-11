namespace API.Models;

public class ChatGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CreatedById { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }

    public AppUser? CreatedBy { get; set; }
    public List<GroupMember> Members { get; set; } = [];
    public List<GroupMessage> Messages { get; set; } = [];
}
