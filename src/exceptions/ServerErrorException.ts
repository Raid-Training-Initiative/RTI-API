import HTTPException from "./base/HTTPException";

export default class ServerErrorException extends HTTPException {
    constructor(message: string) {
        super(500, "ServerError", `Internal error: ${message}.`);
    }
}