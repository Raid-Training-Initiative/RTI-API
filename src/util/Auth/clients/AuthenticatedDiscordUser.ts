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

    public recordActivity() {
        this.lastActivityDate = new Date();
    }
}