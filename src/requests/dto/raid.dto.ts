import {
    IRaidEventDocument,
    IRaidLogEntryData,
    IRaidOptions,
    RaidEventStatus,
    RaidLogEntryType,
} from "@RTIBot-DB/documents/IRaidEventDocument";
import Utils from "src/util/Utils";

class RaidCommonDto {
    id: string;

    name: string;
    leader: string;
    status: RaidEventStatus;
    publishedDate?: string;

    comp?: string;

    startTime?: string;
    endTime?: string;
}

export class RaidSummaryDto extends RaidCommonDto {
    participants?: string[];

    static fromDocument(
        document: IRaidEventDocument,
        idMap: Map<string, string | undefined>,
        showParticipants: boolean,
    ): RaidSummaryDto {
        return {
            name: document.name,
            status: document.status,
            startTime: Utils.formatDatetimeString(document.startTime),
            endTime: Utils.formatDatetimeString(document.endTime),
            leader: idMap.get(document.leaderId) ?? document.leaderId,
            comp: document.compositionName,
            publishedDate: Utils.formatDatetimeString(document.publishedDate),
            ...(showParticipants && {
                participants: [
                    ...new Set(
                        document.roles.flatMap((role) =>
                            role.participants.map(
                                (participant) =>
                                    idMap.get(participant) ?? participant,
                            ),
                        ),
                    ),
                ],
            }),
            id: document._id.toHexString(),
        };
    }
}

export class RaidDto extends RaidCommonDto {
    channelId?: string;
    options: IRaidOptions;
    description: string;

    participants: {
        role: string;
        requiredParticipants: number;
        members: string[];
    }[];
    reserves: {
        role: string;
        members: string[];
    }[];

    static fromDocument(
        document: IRaidEventDocument,
        idMap: Map<string, string | undefined>,
    ): RaidDto {
        return {
            name: document.name,
            description: document.description,
            status: document.status,
            startTime: Utils.formatDatetimeString(document.startTime),
            endTime: Utils.formatDatetimeString(document.endTime),
            leader: idMap.get(document.leaderId) ?? document.leaderId,
            comp: document.compositionName,
            publishedDate: Utils.formatDatetimeString(document.publishedDate),
            channelId: document.channelId,
            options: document.options,
            participants: document.roles.map((role) => {
                return {
                    role: role.name,
                    requiredParticipants: role.requiredParticipants,
                    members: role.participants.map(
                        (participant) => idMap.get(participant) ?? participant,
                    ),
                };
            }),
            reserves: document.roles.map((role) => {
                return {
                    role: role.name,
                    members: role.reserves.map(
                        (reserve) => idMap.get(reserve) ?? reserve,
                    ),
                };
            }),
            id: document._id.toHexString(),
        };
    }
}

export class RaidLogDto {
    date: string;
    type: RaidLogEntryType;
    data: {
        user: string;
        roleName: string;
        isReserve: string;
    };

    static fromLog(
        log: IRaidLogEntryData,
        idMap: Map<string, string | undefined>,
    ): RaidLogDto {
        const userId = log.data.user ? log.data.user : log.data;
        return {
            date: Utils.formatDatetimeString(log.date),
            type: log.type,
            data: {
                user: idMap.get(userId) ?? userId,
                roleName: log.data.roleName,
                isReserve: log.data.isReserve,
            },
        };
    }
}
