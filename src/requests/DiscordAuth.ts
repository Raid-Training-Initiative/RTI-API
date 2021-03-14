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
    public validate_request() {
        super.validate_request();

        if (this.req.query["code"] == undefined) {
            throw new MissingQueryParameterException("code");
        }
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /guildoptions request.
     * @returns An object representing a member.
     */
    public async prepare_response(): Promise<Object> {
        return await Auth.instance().authenticate_with_discord(this.req.query["code"] as string);
    }

}