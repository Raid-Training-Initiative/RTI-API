import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";
import IAuthenticatedClient from "./IAuthenticatedClient"

export default class AuthenticatedServiceClient implements IAuthenticatedClient {
    public readonly expired = false;

    constructor(
        public readonly token,
        public readonly id) {
    }

    public hasPermissions(permissions: MemberPermission[]): Promise<boolean> {
        return Promise.resolve(true);
    }
    
    public recordActivity() {
    }
}