import { promises as filepromises, watch as filewatch } from "fs";
import ServerErrorException from "../../exceptions/ServerErrorException";
import { IConfig } from "../Config";
import AuthenticatedServiceClient from "./clients/AuthenticatedServiceClient";
import IAuthenticatedClient from "./clients/IAuthenticatedClient";
import DiscordAuthService from "./discord/DiscordAuthService";
import { TokenGenerator } from "ts-token-generator";
import DB from "../DB";
import UnauthorizedException from "../../exceptions/UnauthorizedException";
import AuthenticatedDiscordUser from "./clients/AuthenticatedDiscordUser";
import SessionExpiredException from "../../exceptions/SessionExpiredException";

export default class Auth {
    private static _instance: Auth;
    private readonly _clients: Map<string, IAuthenticatedClient>;
    private readonly _discordAuthService: DiscordAuthService | undefined;
    private readonly _tokenGenerator: TokenGenerator;

    private constructor(private readonly _config: IConfig) {
        this._clients = new Map();
        this._discordAuthService = this._config.discordAuth
            ? new DiscordAuthService(this._config.discordAuth)
            : undefined;
        this._tokenGenerator = new TokenGenerator();

        filewatch(this._config.clientsFile, (eventType) => {
            if (eventType == "change") {
                this.importServiceClients();
            }
        });
    }

    /**
     * Creates an instance of this class if it does not exist already and imports the service clients.
     * @param config The configuration which includes the authentication details.
     * @throws {ServerErrorException} When this method is called after the instance is already created.
     */
    public static async create(config: IConfig) {
        if (!this._instance) {
            this._instance = new this(config);
            await this._instance.importServiceClients();
        } else {
            throw new ServerErrorException(
                "Attempted to create duplicate authentication instance.",
            );
        }
    }

    /**
     * Method to retrieve the instance of this class.
     * @returns The Auth instance that has already been created.
     */
    public static instance(): Auth {
        if (this._instance) {
            return this._instance;
        } else {
            throw new ServerErrorException(
                "Authentication instance not properly initialised.",
            );
        }
    }

    /**
     * Takes a client secret and returns a client ID or undefined if the secret was invalid.
     * @param client_secret The client secret.
     * @returns A string of the client_id that it succeeded in finding, or undefined if the secret was invalid.
     * @throws {InvalidAuthenticationException} Raised when the client doens't have a session.
     * @throws {SessionExpiredException} Raised when the client has a session that has expired.
     */
    public authenticate(client_secret: string): IAuthenticatedClient {
        const client = this._clients.get(client_secret);

        if (client === undefined) {
            throw new UnauthorizedException("Invalid token");
        }

        if (client.expired) {
            throw new SessionExpiredException();
        }

        client.recordActivity();

        return client;
    }

    /**
     * Takes a discord OAuth2 code and generates a token for the user.
     * @param code The discord OAuth authentication code.
     * @throws {UnauthorizedException} if the user who initiated the authentication is not a discord member.
     */
    public async authenticateWithDiscord(code: string) {
        if (this._discordAuthService === undefined) {
            throw new ServerErrorException(
                "Discord Authentication is not enabled.",
            );
        }

        const tokenInfo = await this._discordAuthService.getTokenInfo(code);
        const userInfo = await this._discordAuthService.getUserInfo(tokenInfo);

        const member = await DB.queryMemberById(userInfo.id);
        if (member) {
            // For now, being a member is enough to have access
            for (const [token, client] of this._clients) {
                if (
                    client instanceof AuthenticatedDiscordUser &&
                    client.discordUserInfo.id == userInfo.id
                ) {
                    this._clients.delete(token);
                }
            }

            const token = this._tokenGenerator.generate();
            const client = new AuthenticatedDiscordUser(
                token,
                tokenInfo,
                userInfo,
            );
            this._clients.set(token, client);

            return { token, userInfo };
        } else {
            throw new UnauthorizedException("You are not a member.");
        }
    }
    /**
     * Reads the clients.json file and imports it into the clients object.
     * @throws {ServerErrorException} When there was an error reading the clients.json file.
     */
    private async importServiceClients() {
        try {
            // The clients file contains a JSON object of key/value pairs, where the key is the client secret and the value is the client ID.
            const fileContent = await filepromises.readFile(
                this._config.clientsFile,
                "utf-8",
            );
            const serviceClients: Record<string, string> = JSON.parse(
                fileContent.toString(),
            );

            // Wipe any existing service client.
            for (const [token, client] of this._clients) {
                if (client instanceof AuthenticatedServiceClient) {
                    this._clients.delete(token);
                }
            }

            // Insert the new service clients.
            for (const token of Object.keys(serviceClients)) {
                const name = serviceClients[token];
                const serviceClient = new AuthenticatedServiceClient(
                    token,
                    name,
                );
                this._clients.set(serviceClient.token, serviceClient);
            }
        } catch {
            throw new ServerErrorException("Error reading client token data.");
        }
    }
}
