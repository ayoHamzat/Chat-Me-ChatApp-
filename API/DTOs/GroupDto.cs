namespace API.DTOs;

public class GroupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<string> MemberIds { get; set; } = [];
    public List<string> MemberNames { get; set; } = [];
    public int UnreadCount { get; set; }
    public bool HasHistory { get; set; }
}
