import { NextFunction, Request, Response } from "express";
import HTTPException from "../../exceptions/base/HTTPException";
import ServerErrorException from "../../exceptions/ServerErrorException";
import { Logger, Severity } from "../../util/Logger";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";
import RequestOptions from "./RequestOptions";
import JsonValidationErrorException from "../../exceptions/JsonValidationErrorException";
import { Validator, ValidatorResult } from "jsonschema";
import HTTPRequest from "./HTTPRequest";

export default abstract class HTTPPostRequest extends HTTPRequest {
    public abstract requestBodyJsonSchema: object; // A JSON schema to match the request body to.

    constructor(req: Request, res: Response, next: NextFunction, options?: RequestOptions) {
        super(req, res, next, options);
    }

    /**
     * Validates the request and throws an error if validation fails.
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     * @throws {BadSyntaxException} When a query parameter isn't one of the supported values.
     * @throws {JsonValidationErrorException} When the request body does not follow the JSON schema.
     */
    public validateRequest() {
        super.validateRequest();
        if (this.requestBodyJsonSchema != {}) this.validateRequestBody();
    }

    /**
     * Checks if the request body is valid or not against the schema in the requestBodyJsonSchema field.
     * @throws {JsonValidationErrorException} When the JSON body doesn't match the schema.
     */
    private validateRequestBody() {
        const validator: Validator = new Validator();
        const result: ValidatorResult = validator.validate(this._req.body, this.requestBodyJsonSchema);

        if (!result.valid) {
            throw new JsonValidationErrorException(result.errors[0].stack); // Throw the top error message in the list.
        }
    }

    /**
     * Executes the request and handles errors.
     */
    public async run() {
        try
        {
            Logger.logRequest(Severity.Debug, this._timestamp, `Request: ${this._req.method} ${this._req.url}`);
            this.validateRequest();
            const document = await this.prepareResponse();
            this.sendResponse(document);
        } catch (exception) {
            if (exception instanceof HTTPException) {
                Logger.logHttpError(Severity.Warn, this._timestamp, exception);
                this._next(exception);
            } else if (exception.kind == "ObjectId") { // If the object ID cast failed
                const notFound: ResourceNotFoundException = new ResourceNotFoundException(exception.value);
                Logger.logHttpError(Severity.Warn, this._timestamp, notFound);
                this._next(notFound);
            } else {
                Logger.logError(Severity.Error, exception);
                this._next(new ServerErrorException(exception.message));
            }
        }
    }

    protected sendResponse(document: Object) {
        Logger.logRequest(Severity.Debug, this._timestamp, `Sending successfully created resource`);
        this._res.status(201);
        this._res.set("Content-Type", "application/json");
        this._res.send(document);
    }
}