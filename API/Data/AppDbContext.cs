using System;
using API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {

    }

    public DbSet<Message> Messages { get; set; }
    public DbSet<ChatGroup> ChatGroups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }
    public DbSet<GroupMessage> GroupMessages { get; set; }
}
