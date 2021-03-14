import HTTPException from "./base/HTTPException";

export default class MissingQueryParameterException extends HTTPException {
    constructor(queryParam: string) {
        super(400, "InvalidQueryParameters", `Missing query parameter: ${queryParam}`);
    }
}