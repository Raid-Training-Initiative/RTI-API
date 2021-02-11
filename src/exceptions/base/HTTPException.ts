/**
 * Base class for HTTP exceptions.
 */
export default class HTTPException extends Error {
    public status: number;
    public name: string;
    public message: string;

    constructor(status: number, name: string, message: string) {
        super(message);
        this.status = status;
        this.name = name;
        this.message = message;
    }
}