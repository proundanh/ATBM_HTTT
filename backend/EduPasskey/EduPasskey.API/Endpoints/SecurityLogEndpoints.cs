using EduPasskey.API.Abstractions;
using EduPasskey.API.Entities;
using EduPasskey.API.Extensions;
using EduPasskey.API.Features.SecurityLogs.Queries.GetSecurityLogs;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EduPasskey.API.Endpoints;

public class SecurityLogEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapApiV1Group("security-logs").RequireAuthorization();

        // 16. GET /api/v1/security-logs?page=1&pageSize=20&isSuccess=&eventType=
        group.MapGet("", async (
            [FromQuery] int page,
            [FromQuery] int pageSize,
            [FromQuery] bool? isSuccess,
            [FromQuery] SecurityEventType? eventType,
            ISender sender,
            CancellationToken ct) =>
        {
            var p = page < 1 ? 1 : page;
            var ps = pageSize < 1 ? 20 : pageSize;
            var query = new GetSecurityLogsQuery(p, ps, isSuccess, eventType);
            var result = await sender.Send(query, ct);
            return result.ToHttpResult();
        });
    }
}
