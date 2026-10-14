namespace EduPasskey.API.Shared;

public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error? Error { get; }

    protected Result(bool isSuccess, Error? error = null)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(value);
    public static Result<T> Failure<T>(Error error) => new(error);
}

public class Result<T> : Result
{
    public T Value { get; }

    internal Result(T value) : base(true) => Value = value;
    internal Result(Error error) : base(false, error) => Value = default!;
}
