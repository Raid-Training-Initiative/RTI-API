/**
 * Base class for HTTP exceptions.
 */
export default class HTTPException extends Error {
    status: number;
    name: string;
    message: string;

    constructor(status: number, name: string, message: string) {
        super(message);
        this.status = status;
        this.name = name;
        this.message = message;
    }
}