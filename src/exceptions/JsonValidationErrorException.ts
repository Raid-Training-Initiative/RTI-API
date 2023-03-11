import HTTPException from "./base/HTTPException";

export default class JsonValidationError extends HTTPException {
  constructor(jsonError: string) {
    super(
      400,
      "JsonValidationError",
      `Error in JSON request body: ${jsonError}`
    );
  }
}
