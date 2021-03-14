import HTTPException from "./base/HTTPException";

export default class InvalidAuthenticationException extends HTTPException {
    constructor() {
        super(401, "Unauthorized", `Invalid authentication. Please provide a valid Authorization header.`);
    }
}