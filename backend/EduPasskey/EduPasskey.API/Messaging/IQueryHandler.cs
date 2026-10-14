using EduPasskey.API.Shared;
using MediatR;

namespace EduPasskey.API.Messaging;

/// <summary>Handler for a read-only query.</summary>
public interface IQueryHandler<TQuery, TResponse>
    : IRequestHandler<TQuery, Result<TResponse>>
    where TQuery : IQuery<TResponse>;

