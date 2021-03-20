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
    public validate_request() {
        super.validate_request();
        if (this.requestBodyJsonSchema != {}) this.validate_request_body();
    }

    /**
     * Checks if the request body is valid or not against the schema in the requestBodyJsonSchema field.
     * @throws {JsonValidationErrorException} When the JSON body doesn't match the schema.
     */
    private validate_request_body() {
        const validator: Validator = new Validator();
        const result: ValidatorResult = validator.validate(this.req.body, this.requestBodyJsonSchema);

        if (!result.valid) {
            throw new JsonValidationErrorException(result.errors[0].stack); // Throw the top error message in the list.
        }
    }

    public get client_id() {
        return this._client_id;
    }

    /**
     * Executes the request and handles errors.
     */
    public async run() {
        try
        {
            Logger.log_request(Severity.Debug, this.timestamp, `Request: ${this.req.method} ${this.req.url}`);
            this.validate_request();
            const document = await this.prepare_response();
            this.send_response(document);
        } catch (exception) {
            if (exception instanceof HTTPException) {
                Logger.log_http_error(Severity.Warn, this.timestamp, exception);
                this.next(exception);
            } else if (exception.kind == "ObjectId") { // If the object ID cast failed
                const notFound: ResourceNotFoundException = new ResourceNotFoundException(exception.value);
                Logger.log_http_error(Severity.Warn, this.timestamp, notFound);
                this.next(notFound);
            } else {
                Logger.log_error(Severity.Error, exception);
                this.next(new ServerErrorException(exception.message));
            }
        }
    }

    protected send_response(document: Object) {
        Logger.log_request(Severity.Debug, this.timestamp, `Sending successfully created resource`);
        this.res.status(201);
        this.res.set("Content-Type", "application/json");
        this.res.send(document);
    }
}