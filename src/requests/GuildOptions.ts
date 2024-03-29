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
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns the JSON string payload of a discord server's options after making a GET /guildoptions request.
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryGuildOptions();
        if (document == undefined) {
            throw new ServerErrorException(
                "Guild options not found in database",
            );
        }

        const formattedDocument = {
            raidUnregisterNotificationTime:
                document.raidUnregisterNotificationTime,
            raidReminderNotificationTime: document.raidReminderNotificationTime,
            autoUnpublishTime: document.autoUnpublishTime,
            trainingRequestAutoSyncInterval:
                document.trainingRequestAutoSyncInterval,
            trainingRequestInactiveDaysBeforeDisable:
                document.trainingRequestInactiveDaysBeforeDisable,
            raidAutoBroadcastTime: document.raidAutoBroadcastTime,
            memberRoleId: document.memberRoleId,
            guildApplicationsChannelId: document.guildApplicationsChannelId,
            raidCategoryId: document.raidCategoryId,
            raidDraftCategoryId: document.raidDraftCategoryId,
            dbVersion: document.dbVersion,
            additionalRoleIds: document.additionalRoleIds,
            serverRegion: document.serverRegion,
            dynamicCompOptions: {
                genericAlacrity: document.dynamicCompOptions.genericAlacrity,
                healAlacrity: document.dynamicCompOptions.healAlacrity,
                dpsAlacrity: document.dynamicCompOptions.dpsAlacrity,
                genericQuickness: document.dynamicCompOptions.genericQuickness,
                healQuickness: document.dynamicCompOptions.healQuickness,
                dpsQuickness: document.dynamicCompOptions.dpsQuickness,
                dps: document.dynamicCompOptions.dps,
            },
            roleRequests: document.roleRequests,
            roleRequestsLimit: document.roleRequestsLimit,
            wingRoles: document.wingRoles,
            feedbackBroadcastTime: document.feedbackBroadcastTime,
            feedbackMessage: document.feedbackMessage,
        };

        return formattedDocument;
    }
}
