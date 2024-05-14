import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";

export class MemberDto {
    gw2Name: string;
    userId: string;
    banned: boolean;

    discordName?: string;
    discordTag?: string;

    approver?: string;

    static fromDocument(
        document: IMemberDocument,
        idMap: Map<string, string | undefined>,
    ): MemberDto {
        return {
            gw2Name: document.gw2Name,
            discordName: document.discordName,
            discordTag: document.discordTag,
            approver: idMap.get(document.approverId),
            userId: document.userId,
            banned: document.banned,
        };
    }
}
