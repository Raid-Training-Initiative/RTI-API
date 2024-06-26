/**
 * File for classes that handle requests for discord auth tokens.
 */

import { NextFunction, Request, Response } from "express";
import HTTPPostRequest from "./base/HTTPPostRequest";
import Auth from "../util/auth/Auth";
import * as fs from "fs";
import IDiscordUserInfo from "src/util/auth/discord/IDiscordUserInfo";

export class PostDiscordAuth extends HTTPPostRequest {
    public validRequestQueryParameters: string[] = [];

    public requestBodyJsonSchema: object = JSON.parse(
        fs.readFileSync("resources/schemas/discordauth.schema.json", "utf8"),
    );

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns the JSON object containing user info and token after making a POST /discordauth request.
     * @returns An object representing discord auth.
     */
    public async prepareResponse(): Promise<{
        token: string;
        userInfo: IDiscordUserInfo;
    }> {
        return await Auth.instance().authenticateWithDiscord(
            this._req.body.code as string,
        );
    }
}
