import type HTTPException from "../exceptions/base/HTTPException";
import type { NextFunction, Request, Response } from "express";

/**
 * Middleware function for formatting error responses from HTTP exceptions.
 * @param error The error, which is an HTTPException.
 * @param request The HTTP request being made.
 * @param response The HTTP response being returned.
 * @param next The next function to run in the stack before returning the response.
 */
export default function errorMiddleware(
    error: HTTPException,
    _request: Request,
    response: Response,
    next: NextFunction,
) {
    const status = error.status || 500;
    const name = error.name || "Unknown";
    const message = error.message || "Something went wrong";
    response.status(status).send({
        status,
        name: name,
        message,
    });
    return next();
}
