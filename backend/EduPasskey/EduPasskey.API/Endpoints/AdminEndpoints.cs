using EduPasskey.API.Abstractions;
using EduPasskey.API.Extensions;
using EduPasskey.API.Features.Admin.Queries.GetAdminLogs;
using EduPasskey.API.Features.Admin.Queries.GetStudents;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EduPasskey.API.Endpoints;

public class AdminEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapApiV1Group("admin").RequireAuthorization();

        // 17. GET /api/v1/admin/students?search=&page=1&pageSize=20
        group.MapGet("students", async (
            [FromQuery] string? search,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            var p = page < 1 ? 1 : page;
            var ps = pageSize < 1 ? 20 : pageSize;
            var query = new GetStudentsQuery(search, p, ps);
            var result = await sender.Send(query, ct);
            return result.ToHttpResult();
        });

        // 18. GET /api/v1/admin/security-logs?studentCode=&isSuccess=&from=&to=&page=&pageSize=
        group.MapGet("security-logs", async (
            [FromQuery] string? studentCode,
            [FromQuery] bool? isSuccess,
            [FromQuery] DateTimeOffset? from,
            [FromQuery] DateTimeOffset? to,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            ISender sender,
            CancellationToken ct) =>
        {
            var p = page < 1 ? 1 : page;
            var ps = pageSize < 1 ? 20 : pageSize;
            var query = new GetAdminLogsQuery(studentCode, isSuccess, from, to, p, ps);
            var result = await sender.Send(query, ct);
            return result.ToHttpResult();
        });
    }
}
