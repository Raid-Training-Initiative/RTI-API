/**
 * File for classes that handle requests for discord auth tokens.
 */

import { NextFunction, Request, Response } from "express";
import HTTPRequest from "./base/HTTPRequest";
import Auth from "../util/Auth/Auth";
import { Validator } from "jsonschema";
import JsonValidationError from "../exceptions/JsonValidationErrorException";

export class GetDiscordAuth extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
    ];

    public requestBodyJsonSchema: Object = {
        "code": "string",
    }

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public async validateRequest() {
        await super.validateRequest();
        this.validateRequestBody();
    }

    /**
     * Returns the JSON object containing user info and token after making a POST /discordauth request.
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<Object> {
        return await Auth.instance().authenticateWithDiscord(this._req.body.code as string);
    }

    /**
     * Checks if the request body is valid or not against the schema in the requestBodyJsonSchema field
     * @throws {JsonValidationErrorException} when the JSON body doesn't match the schema
     */
    private validateRequestBody() {
        const validator = new Validator();
        const result = validator.validate(this._req.body, this.requestBodyJsonSchema);

        if (!result.valid) {
            throw new JsonValidationError(result.errors[0].stack);
        }
    }
}
