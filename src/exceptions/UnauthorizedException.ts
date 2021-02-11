import HTTPException from "./base/HTTPException";

export default class UnauthorizedException extends HTTPException {
    constructor() {
        super(401, "Unauthorized", `Invalid authentication. Please provide a valid Authorization header.`);
    }
}