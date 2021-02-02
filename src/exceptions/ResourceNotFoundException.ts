import HTTPException from "./HTTPException";

export default class ResourceNotFoundException extends HTTPException {
    constructor(resource: string) {
        super(404, "ResourceNotFound", `Resource ${resource} not found.`);
    }
}