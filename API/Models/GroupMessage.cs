namespace API.Models;

public class GroupMessage
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public bool IsRead { get; set; }

    public ChatGroup? Group { get; set; }
    public AppUser? Sender { get; set; }
}
