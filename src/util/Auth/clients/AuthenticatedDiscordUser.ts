import IDiscordTokenInfo from "../discord/IDiscordTokenInfo";
import IDiscordUserInfo from "../discord/IDiscordUserInfo";
import IAuthenticatedClient from "./IAuthenticatedClient"

export default class AuthenticatedDiscordUser implements IAuthenticatedClient {
    constructor(
        public readonly token: string,
        public readonly discordTokenInfo: IDiscordTokenInfo,
        public readonly discordUserInfo: IDiscordUserInfo) {
    }
    
    get id() {
        return this.discordUserInfo.id;
    }
}