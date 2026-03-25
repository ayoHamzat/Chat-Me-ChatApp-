using API.Common;
using API.DTOs;
using API.Services;

namespace API.Endpoints;

public static class AiEndpoint
{
    public static RouteGroupBuilder MapAiEndpoint(this WebApplication app)
    {
        var group = app.MapGroup("/api/ai").WithTags("ai");

        group.MapPost("/chat", async (AiChatDto dto, GeminiService geminiService) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
            {
                return Results.BadRequest(Response<string>.Failure("Message is required."));
            }

            try
            {
                var reply = await geminiService.GenerateReplyAsync(dto.Message);
                return Results.Ok(Response<string>.Success(reply, "AI response generated."));
            }
            catch (Exception ex)
            {
                return Results.Ok(Response<string>.Failure(ex.Message));
            }
        });

        return group;
    }
}