import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";
import IAuthenticatedClient from "./IAuthenticatedClient"

export default class AuthenticatedServiceClient implements IAuthenticatedClient {
    public readonly expired = false;

    constructor(
        public readonly token,
        public readonly id) {
    }

    /**
     * Returns whether the user has the required permissions
     * @param permissions An array of permissions. 
     * @returns Always true for this type of client.
     */
    public hasPermissions(permissions: MemberPermission[]): Promise<boolean> {
        return Promise.resolve(true);
    }
    
    /**
     * Called by the parent when the user makes a request.
     */
    public recordActivity() {
    }
}