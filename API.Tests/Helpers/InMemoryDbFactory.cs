using API.Data;
using API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace API.Tests.Helpers;

public static class InMemoryDbFactory
{
    public static AppDbContext Create(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new AppDbContext(options);
    }

    public static UserManager<AppUser> CreateUserManager(AppDbContext context)
    {
        var services = new ServiceCollection();

        services.AddDbContext<AppDbContext>(opt =>
            opt.UseInMemoryDatabase("identity-" + Guid.NewGuid()));

        services.AddIdentityCore<AppUser>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        // Override the real db with the one we already created
        var store = new UserStore<AppUser>(context);
        var passwordHasher = new PasswordHasher<AppUser>();
        var validators = new List<IUserValidator<AppUser>> { new UserValidator<AppUser>() };
        var pwValidators = new List<IPasswordValidator<AppUser>> { new PasswordValidator<AppUser>() };
        var normalizer = new UpperInvariantLookupNormalizer();
        var errorDescriber = new IdentityErrorDescriber();

        return new UserManager<AppUser>(
            store,
            null!,
            passwordHasher,
            validators,
            pwValidators,
            normalizer,
            errorDescriber,
            null!,
            null!
        );
    }

    public static async Task<AppUser> CreateUserAsync(UserManager<AppUser> userManager, string userName = "testuser", string email = "test@test.com")
    {
        var user = new AppUser
        {
            UserName = userName,
            Email = email,
            FullName = "Test User",
            ProfileImage = "assets/avatar.png",
        };
        await userManager.CreateAsync(user, "Password123!");
        return user;
    }
}
