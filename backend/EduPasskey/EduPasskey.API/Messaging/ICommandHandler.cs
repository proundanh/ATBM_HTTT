using EduPasskey.API.Shared;
using MediatR;

namespace EduPasskey.API.Messaging;

public interface ICommandHandler<TCommand>
    : IRequestHandler<TCommand, Result>
    where TCommand : ICommand;

/// <summary>Handler for a command that returns a typed value.</summary>
public interface ICommandHandler<TCommand, TResponse>
    : IRequestHandler<TCommand, Result<TResponse>>
    where TCommand : ICommand<TResponse>;
