import {
    IDynamicCompOptions,
    IFeedbackConfigData,
    IGuildOptionsData,
    IRaidCategory,
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
    raidCategories?: IRaidCategory[];
    raidDraftCategoryId?: string;

    feedbackConfig?: IFeedbackConfigData;

    additionalRoleIds: string[];

    serverRegion: ServerRegion;
    dynamicCompOptions: IDynamicCompOptions;

    roleRequestsLimit: number;
    roleRequests: IRoleRequest[];

    wingRoles: IWingRole[];

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
            raidCategories: document.raidCategories,
            raidDraftCategoryId: document.raidDraftCategoryId,
            feedbackConfig: document.feedbackConfig,
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
            arcDpsChannelId: document.arcDpsChannelId,
            apiKeyMandatory: document.apiKeyMandatory,
        };
    }
}
