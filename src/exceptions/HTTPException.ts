/**
 * Base class for HTTP exceptions.
 */
export default class HTTPException {
    status: number;
    errorCode: string;
    message: string;

    constructor(status: number, errorCode: string, message: string) {
        this.status = status;
        this.errorCode = errorCode;
        this.message = message;
    }
}