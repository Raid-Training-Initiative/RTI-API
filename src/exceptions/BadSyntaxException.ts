import HTTPException from "./HTTPException";

export default class BadSyntaxException extends HTTPException {
    constructor(message: string) {
        super(400, "BadSyntax", message);
    }
}