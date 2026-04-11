namespace API.DTOs;

public class GroupMessageDto
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string SenderProfilePicture { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public bool IsRead { get; set; }
}
