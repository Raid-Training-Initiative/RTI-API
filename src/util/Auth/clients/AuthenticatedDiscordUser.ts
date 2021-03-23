import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";
import DB from "../../DB";
import IDiscordTokenInfo from "../discord/IDiscordTokenInfo";
import IDiscordUserInfo from "../discord/IDiscordUserInfo";
import IAuthenticatedClient from "./IAuthenticatedClient"

export default class AuthenticatedDiscordUser implements IAuthenticatedClient {
    private static readonly EXPIRES_IN  = 10 * 3600;

    private lastActivityDate: Date = new Date();

    public constructor(
        public readonly token: string,
        public readonly discordTokenInfo: IDiscordTokenInfo,
        public readonly discordUserInfo: IDiscordUserInfo) {
    }
    
    public get id() {
        return this.discordUserInfo.id;
    }

    public get expired() {
        return Date.now() > (this.lastActivityDate.getTime() + AuthenticatedDiscordUser.EXPIRES_IN * 1000);
    }

    /**
     * Called by the parent when the user makes a request.
     */
    public recordActivity() {
        this.lastActivityDate = new Date();
    }

    /**
     * Returns whether the user has the required permissions.
     * @param permissions An array of permissions. 
     * @returns True if the user has all the permissions.
     */
    public async hasPermissions(permissions: MemberPermission[]): Promise<boolean> {
        const user = await DB.queryMemberPopulatedById(this.discordUserInfo.id);
        if (user) {
            const permissionsSet: Set<MemberPermission> = new Set();
            user.roles.forEach(role => {
                role.permissions.forEach(permission => permissionsSet.add(permission));
            });

            for (const permission of permissions) {
                if (!permissionsSet.has(permission)) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }
}