import HTTPException from "./base/HTTPException";

export default class ResourceAlreadyExistsException extends HTTPException {
    constructor(resource: string) {
        super(
            422,
            "ResourceAlreadyExists",
            `Resource ${resource} already exists.`,
        );
    }
}
