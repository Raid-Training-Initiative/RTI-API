import { IRoleRequest } from "@RTIBot-DB/documents/IGuildOptionsDocument";
import {
    ITrainingRequestDocument,
    TrainingRequestDisabledReason,
} from "@RTIBot-DB/documents/ITrainingRequestDocument";
import Utils from "src/util/Utils";

export class TrainingRequestSummaryDto {
    userId: string;
    discordTag: string;
    active: boolean;

    requestedWings: number[];
    requestedRoles: IRoleRequest[];

    wingOverrides: number[];

    comment: string;

    created: string;
    edited: string;

    disabledReason: TrainingRequestDisabledReason;

    static fromDocument(
        document: ITrainingRequestDocument,
        idMap: Map<string, string | undefined>,
    ): TrainingRequestSummaryDto {
        return {
            discordTag: idMap.get(document.userId) ?? document.userId,
            active: document.active,
            requestedWings: document.requestedWings,
            requestedRoles: document.requestedRoles,
            wingOverrides: document.wingOverrides,
            comment: document.comment,
            created: Utils.formatDatetimeString(document.creationDate),
            edited: Utils.formatDatetimeString(document.lastEditedTimestamp),
            disabledReason: document.disabledReason,
            userId: document.userId,
        };
    }
}

export class TrainingRequestDto extends TrainingRequestSummaryDto {
    history: Record<string, { requested?: string; cleared?: string }>;
    rolesHistory: Record<string, { requested?: string; cleared?: string }>;

    static fromDocument(
        document: ITrainingRequestDocument,
        idMap: Map<string, string | undefined>,
    ): TrainingRequestDto {
        const historyMap: Record<
            string,
            { requested?: string; cleared?: string }
        > = {};

        document.history.forEach(
            (value, key) =>
                (historyMap[key] = {
                    requested: Utils.formatDatetimeString(value.requestedDate),
                    cleared: Utils.formatDatetimeString(value.clearedDate),
                }),
        );

        const rolesHistoryMap: Record<
            string,
            { requested?: string; cleared?: string }
        > = {};
        document.rolesHistory.forEach(
            (value, key) =>
                (historyMap[key] = {
                    requested: Utils.formatDatetimeString(value.requestedDate),
                    cleared: Utils.formatDatetimeString(value.clearedDate),
                }),
        );

        return {
            discordTag: idMap.get(document.userId) ?? document.userId,
            active: document.active,
            requestedWings: document.requestedWings,
            requestedRoles: document.requestedRoles,
            wingOverrides: document.wingOverrides,
            comment: document.comment,
            created: Utils.formatDatetimeString(document.creationDate),
            edited: Utils.formatDatetimeString(document.lastEditedTimestamp),
            disabledReason: document.disabledReason,
            userId: document.userId,
            history: historyMap,
            rolesHistory: rolesHistoryMap,
        };
    }
}
