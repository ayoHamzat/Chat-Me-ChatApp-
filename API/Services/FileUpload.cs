using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace API.Services;

public class FileUpload
{
    public static async Task<string> Upload(IFormFile file)
    {
        var cloudName = Environment.GetEnvironmentVariable("Cloudinary__CloudName");
        var apiKey = Environment.GetEnvironmentVariable("Cloudinary__ApiKey");
        var apiSecret = Environment.GetEnvironmentVariable("Cloudinary__ApiSecret");

        if (!string.IsNullOrEmpty(cloudName) && !string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            var cloudinary = new Cloudinary(account);

            await using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = "chatapp"
            };

            var result = await cloudinary.UploadAsync(uploadParams);
            return result.SecureUrl.ToString();
        }

        // Fallback to local storage for development
        var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");

        if (!Directory.Exists(uploadFolder))
            Directory.CreateDirectory(uploadFolder);

        var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        var filePath = Path.Combine(uploadFolder, fileName);

        await using var localStream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(localStream);
        return fileName;
    }
}
