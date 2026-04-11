namespace API.DTOs;

public class CreateGroupDto
{
    public string Name { get; set; } = string.Empty;
    public List<string> MemberIds { get; set; } = [];
}
