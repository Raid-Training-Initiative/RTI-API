import HTTPException from "./HTTPException";

export default class InvalidQueryParametersException extends HTTPException {
    constructor(queryParam: string) {
        super(400, "InvalidQueryParameters", `Incorrect query parameter: ${queryParam}`);
    }
}