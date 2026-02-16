namespace SpendTracker.Domain.Models;

public enum ServiceErrorType
{
    NotFound,
    Conflict,
    Validation,
    Error
}

public record ServiceError(ServiceErrorType Type, string Message);

public record ServiceResult<T>(bool Success, ServiceError? Error, T? Value)
{
    public static ServiceResult<T> Ok(T value) => new(true, null, value);

    public static ServiceResult<T> Fail(ServiceErrorType type, string message, T? value = default)
        => new(false, new ServiceError(type, message), value);
}