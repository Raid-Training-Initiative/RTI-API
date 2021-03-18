import HTTPException from "./base/HTTPException";

export default class ResourceAlreadyExistsException extends HTTPException {
    constructor(resource: string) {
        super(404, "ResourceAlreadyExists", `Resource ${resource} already exists.`);
    }
}