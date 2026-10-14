using EduPasskey.API.Shared;
using MediatR;

namespace EduPasskey.API.Messaging;



/// <summary>Read-only query that returns a typed value.</summary>
public interface IQuery<TResponse> : IRequest<Result<TResponse>>;

