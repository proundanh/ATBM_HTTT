using EduPasskey.API.Shared;
using MediatR;

namespace EduPasskey.API.Messaging;

/// <summary>
/// Marker interface for all commands — operations that change state and return a Result.
/// </summary>
public interface ICommand : IRequest<Result>;

/// <summary>
/// Marker interface for commands that return a typed value.
/// </summary>
public interface ICommand<TResponse> : IRequest<Result<TResponse>>;
