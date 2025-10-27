import { IMemberPopulatedDocument } from "@RTIBot-DB/documents/IMemberDocument";

export class MemberDto {
    gw2Name: string;
    userId: string;

    discordName?: string;
    discordTag?: string;

    approver?: string;

    static fromDocument(
        document: IMemberPopulatedDocument,
        idMap: Map<string, string | undefined>,
    ): MemberDto {
        return {
            gw2Name: document.account.gw2Name,
            discordName: document.discordName,
            discordTag: document.account.discordTag,
            approver: idMap.get(document.approverId),
            userId: document.account.userId,
        };
    }
}
