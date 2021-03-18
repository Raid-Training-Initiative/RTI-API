/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import DB from "../util/DB";
import ServerErrorException from "../exceptions/ServerErrorException";
import HTTPGetRequest from "./base/HTTPGetRequest";

export class GetGuildOptions extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /guildoptions request.
     * @returns An object representing a member.
     */
    public async prepare_response(): Promise<Object> {
        const document = await DB.query_guild_options();
        if (document == undefined) {
            throw new ServerErrorException("Guild options not found in database");
        }

        const formattedDocument = {
            raidUnregisterNotificationTime: document.raidUnregisterNotificationTime,
            raidReminderNotificationTime: document.raidReminderNotificationTime,
            trainingRequestAutoSyncInterval: document.trainingRequestAutoSyncInterval,
            trainingRequestInactiveDaysBeforeDisable: document.trainingRequestInactiveDaysBeforeDisable,
            raidAutoBroadcastTime: document.raidAutoBroadcastTime,
            commanderRoles: document.commanderRoles,
            officerRoles: document.officerRoles,
            memberRoleId: document.memberRoleId,
            guildApplicationsChannelId: document.guildApplicationsChannelId,
            raidCategoryId: document.raidCategoryId,
            raidDraftCategoryId: document.raidDraftCategoryId,
        };
        
        return formattedDocument;
    }
}