import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";

export default interface IAuthenticatedClient {
    readonly token: string,
    readonly id: string;
    readonly expired: boolean;

    hasPermissions(permissions: MemberPermission[]): Promise<boolean>;
    recordActivity(): void;
}