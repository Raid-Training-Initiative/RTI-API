import HTTPException from "./base/HTTPException";

export default class SessionExpiredException extends HTTPException {
    constructor() {
        super(
            440,
            "SessionExpired",
            `The session associated with this token expired. Please authenticate again.`,
        );
    }
}
