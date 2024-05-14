import {
    IDynamicCompOptions,
    IGuildOptionsData,
    IRoleRequest,
    IWingRole,
    ServerRegion,
} from "@RTIBot-DB/documents/IGuildOptionsDocument";

export class GuildOptionsDto {
    dbVersion: number;

    raidAutoBroadcastTime: number;
    raidUnregisterNotificationTime: number;
    raidReminderNotificationTime: number;

    autoUnpublishTime: number;

    trainingRequestAutoSyncInterval: number;
    trainingRequestInactiveDaysBeforeDisable: number;

    memberRoleId?: string;
    guildApplicationsChannelId?: string;
    raidCategoryId?: string;
    raidDraftCategoryId?: string;

    additionalRoleIds: string[];

    serverRegion: ServerRegion;
    dynamicCompOptions: IDynamicCompOptions;

    roleRequestsLimit: number;
    roleRequests: IRoleRequest[];

    wingRoles: IWingRole[];

    feedbackMessage?: string;
    feedbackBroadcastTime: number;

    static fromDocument(document: IGuildOptionsData): GuildOptionsDto {
        return {
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
    }
}
