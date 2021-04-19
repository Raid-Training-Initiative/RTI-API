import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { URLSearchParams } from "url";
import ServerErrorException from "../../../exceptions/ServerErrorException";
import { IDiscordAuthConfig } from "../../Config";
import IDiscordTokenInfo from "./IDiscordTokenInfo";
import IDiscordUserInfo from "./IDiscordUserInfo";

export default class DiscordAuthService {
    private static readonly API_ENDPOINT = "https://discord.com/api"

    constructor(private readonly discordAuthConfig: IDiscordAuthConfig) {
    }

    /**
     * Uses the Discord OAuth2 api endpoint to retreive a token using the provided code.
     * @param code The OAuth2 code passed in by the user.
     * @returns The token info.
     * @throws {ServerErrorException} if the request to the discord API fails.
     */
    public async getTokenInfo(code: string): Promise<IDiscordTokenInfo> {
        const data = {
            client_id: this.discordAuthConfig.clientId,
            client_secret: this.discordAuthConfig.clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: "http://localhost:8080/login",
            scope: "identify",
        };

        const options: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
        }

        try {
            const tokenResponse = await axios.post<IDiscordTokenInfo>(`${DiscordAuthService.API_ENDPOINT}/oauth2/token`,
                new URLSearchParams(data), 
                options);
            
            return tokenResponse.data;

        } catch (err) {
            if (err.isAxiosError) {
                const axiosError = err as AxiosError;
                if (axiosError.response) {
                    throw new ServerErrorException(`Discord token request failed with code ${axiosError.response.status}:\n ${JSON.stringify(axiosError.response.data)}`);
                } else {
                    throw new ServerErrorException(`Discord token request failed with code ${axiosError.code}`);
                }
            }
            else {
                throw new ServerErrorException(err?.message);
            }
        }
    }

    /**
     * Retreives information about the user for a given token.
     * @param tokenInfo The token info to use for authentication with the discord API.
     * @returns Information about the user.
     * @throws {ServerErrorException} if the request to the discord API fails.
     */
    public async getUserInfo(tokenInfo: IDiscordTokenInfo): Promise<IDiscordUserInfo> {
        const options: AxiosRequestConfig = {
            headers: {
                authorization: `${tokenInfo.token_type} ${tokenInfo.access_token}`,
            },
            timeout: 10000,
        }

        try {
            const userResponse = await axios.get<IDiscordUserInfo>(`${DiscordAuthService.API_ENDPOINT}/users/@me`,
                options);
            
            return userResponse.data;

        } catch (err) {
            if (err.isAxiosError) {
                const axiosError = err as AxiosError;
                if (axiosError.response) {
                    throw new ServerErrorException(`Discord User Info Request failed with code ${axiosError.response.status}:\n ${JSON.stringify(axiosError.response.data)}`);
                } else {
                    throw new ServerErrorException(`Discord User Info Request failed with code ${axiosError.code}`);
                }
            }
            else {
                throw new ServerErrorException(err?.message);
            }
        }
    }
}