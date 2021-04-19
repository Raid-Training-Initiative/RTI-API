import HTTPException from "./base/HTTPException";

export default class UnauthorizedException extends HTTPException {
    constructor(reason: string) {
        super(401, "Unauthorized", `Invalid authentication: ${reason}.`);
    }
}