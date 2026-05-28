class AppError(Exception):
    status_code = 500
    message = "Internal server error"

    def __init__(self, message=None, status_code=None, errors=None):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if status_code:
            self.status_code = status_code
        self.errors = errors


class NotFoundError(AppError):
    status_code = 404
    message = "Resource not found"


class ValidationError(AppError):
    status_code = 400
    message = "Validation failed"


class UnauthorizedError(AppError):
    status_code = 401
    message = "Unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    message = "Forbidden"


class ConflictError(AppError):
    status_code = 409
    message = "Resource already exists"
