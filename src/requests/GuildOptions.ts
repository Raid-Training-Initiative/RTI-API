/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import DB from "../util/DB";
import ServerErrorException from "../exceptions/ServerErrorException";
import HTTPGetRequest from "./base/HTTPGetRequest";
import { GuildOptionsDto } from "src/requests/dto/guildOptions.dto";

export class GetGuildOptions extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns the JSON string payload of a discord server's options after making a GET /guildoptions request.
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<GuildOptionsDto> {
        const document = await DB.queryGuildOptions();
        if (document == undefined) {
            throw new ServerErrorException(
                "Guild options not found in database",
            );
        }

        return GuildOptionsDto.fromDocument(document);
    }
}
