import { NextFunction, Request, Response } from "express";
import HTTPException from "../exceptions/HTTPException";
 
export default function errorMiddleware(error: HTTPException, request: Request, response: Response, next: NextFunction) {
  const status = error.status || 500;
  const name = error.name || "Unknown";
  const message = error.message || "Something went wrong";
  response
    .status(status)
    .send({
      status,
      name: name,
      message,
    })
}