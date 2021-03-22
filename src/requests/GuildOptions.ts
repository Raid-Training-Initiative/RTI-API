/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import ServerErrorException from "../exceptions/ServerErrorException";
import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";

export class GetGuildOptions extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.BOT_MANAGEMENT]
            }
        });
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /guildoptions request.
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryGuildOptions();
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