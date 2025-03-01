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
    removeRaidReminderHoursBefore?: number;

    autoUnpublishTime: number;

    trainingRequestAutoSyncInterval: number;
    trainingRequestInactiveDaysBeforeDisable: number;

    memberRoleId?: string;
    guildApplicationsChannelId?: string;
    raidCategoryIds?: string[];
    raidDraftCategoryId?: string;

    additionalRoleIds: string[];

    serverRegion: ServerRegion;
    dynamicCompOptions: IDynamicCompOptions;

    roleRequestsLimit: number;
    roleRequests: IRoleRequest[];

    wingRoles: IWingRole[];

    feedbackMessage?: string;
    feedbackBroadcastTime: number;

    arcDpsChannelId?: string;

    apiKeyMandatory: boolean;

    static fromDocument(document: IGuildOptionsData): GuildOptionsDto {
        return {
            raidUnregisterNotificationTime:
                document.raidUnregisterNotificationTime,
            raidReminderNotificationTime: document.raidReminderNotificationTime,
            removeRaidReminderHoursBefore:
                document.removeRaidReminderHoursBefore,
            autoUnpublishTime: document.autoUnpublishTime,
            trainingRequestAutoSyncInterval:
                document.trainingRequestAutoSyncInterval,
            trainingRequestInactiveDaysBeforeDisable:
                document.trainingRequestInactiveDaysBeforeDisable,
            raidAutoBroadcastTime: document.raidAutoBroadcastTime,
            memberRoleId: document.memberRoleId,
            guildApplicationsChannelId: document.guildApplicationsChannelId,
            raidCategoryIds: document.raidCategoryIds,
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
            arcDpsChannelId: document.arcDpsChannelId,
            apiKeyMandatory: document.apiKeyMandatory,
        };
    }
}
