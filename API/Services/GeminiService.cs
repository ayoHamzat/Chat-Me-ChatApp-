using System.Text;
using System.Text.Json;

namespace API.Services;

public class GeminiService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;

    public GeminiService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["GeminiApiKey"]
               ?? configuration["GEMINIAPI_KEY"]
               ?? Environment.GetEnvironmentVariable("GeminiApiKey")
               ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
               ?? Environment.GetEnvironmentVariable("GEMINIAPIKEY");
    }

    public async Task<string> GenerateReplyAsync(string userMessage)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            throw new InvalidOperationException("Gemini API key is not configured. Add 'GeminiApiKey' to appsettings.Development.json.");

        var url =
            $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_apiKey}";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = userMessage }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(url, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Gemini API error: {response.StatusCode} - {responseBody}");
        }

        using var doc = JsonDocument.Parse(responseBody);

        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return text ?? "No response returned.";
    }
}