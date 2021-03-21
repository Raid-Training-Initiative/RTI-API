/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import HTTPRequest from "./base/HTTPRequest";
import MissingQueryParameterException from "../exceptions/MissingQueryParameterException";
import Auth from "../util/Auth/Auth";

export class GetDiscordAuth extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "code",
    ];

    constructor(
        req: Request, 
        res: Response, 
        next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public validateRequest() {
        super.validateRequest();

        if (this._req.query["code"] == undefined) {
            throw new MissingQueryParameterException("code");
        }
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /guildoptions request.
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<Object> {
        return await Auth.instance().authenticateWithDiscord(this._req.query["code"] as string);
    }

}