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
import InvalidAuthenticationException from "../../exceptions/InvalidAuthenticationException";
import SessionExpiredException from "../../exceptions/SessionExpiredException";

export default class Auth {
    private static _instance: Auth;
    private readonly _clients: Map<string, IAuthenticatedClient>;
    private readonly _discordAuthService: DiscordAuthService;
    private readonly _tokenGenerator: TokenGenerator

    private constructor(private readonly _config: IConfig) {
        this._clients = new Map();
        this._discordAuthService  = new DiscordAuthService(_config.discordAuth);
        this._tokenGenerator = new TokenGenerator();

        filewatch(this._config.clientsFile, (eventType, filename) => {
            if (eventType == "change") {
                this.import_service_clients();
            }
        });
    }

    public static async create(config: IConfig) {
        if (!this._instance) {
            this._instance = new this(config)
            await this._instance.import_service_clients();
        } else {
            throw new ServerErrorException("Attempted to create duplicate authentication instance.");
        }
    }

    public static instance(): Auth {
        if (this._instance) {
            return this._instance;
        } else {
            throw new ServerErrorException("Authentication instance not properly initialised.");
        }
    }

    /**
     * Takes a client secret and returns a client ID or undefined if the secret was invalid.
     * @param client_secret The client secret.
     * @returns A string of the client_id that it succeeded in finding, or undefined if the secret was invalid.
     * @throws {InvalidAuthenticationException} Raised when the client doens't have a session
     * @throws {SessionExpiredException} Raised when the client has a session that has expired
     */
    public authenticate(client_secret: string): IAuthenticatedClient {
        const client = this._clients.get(client_secret);

        if (client === undefined) {
            throw new InvalidAuthenticationException();
        }

        if (client.expired) {
            throw new SessionExpiredException();
        }

        client.recordActivity();

        return client;
    }

    /**
     * Takes a discord OAuth2 code and generates a token for the user
     * @param code The discord oauth authentication code
     * @throws {UnauthorizedException} if the user who initiated the authentication is not a discord member
     */
    public async authenticate_with_discord(code: string) {
        // Retreive the token for the Discord OAuth2 service
        const tokenInfo = await this._discordAuthService.getTokenInfo(code);

        // Retrieve the user info from the Discord API
        const userInfo = await this._discordAuthService.getUserInfo(tokenInfo);

        // Check if the user is in the DB
        // TODO: check if the users has permissions
        const member = await DB.query_member_by_id(userInfo.id);
        if (member) {
            // For now, being a member is enough to have access

            // Remove any existing entry for this user
            for (const [token, client] of this._clients) {
                if (client instanceof AuthenticatedDiscordUser && client.discordUserInfo.id == userInfo.id)  {
                    this._clients.delete(token);
                }
            }
            
            // Insert the new entry
            const token = this._tokenGenerator.generate();
            const client = new AuthenticatedDiscordUser(token, tokenInfo, userInfo);
            this._clients.set(token, client);

            return {
                token,
                userInfo,
            };
        } else {
            throw new UnauthorizedException("You are not a member");
        }
    }
    /**
     * Reads the clients.json file and imports it into the clients object.
     */
    private async import_service_clients() {
        try {
            // The clients file contains a JSON object of key/value pairs, where the key is the client secret and the value is the client ID. 
            const fileContent = await filepromises.readFile(this._config.clientsFile, "utf-8");
            const serviceClients: Object = JSON.parse(fileContent.toString());

            // Wipe any existing service client
            for (const [token, client] of this._clients) {
                if (client instanceof AuthenticatedServiceClient) {
                    this._clients.delete(token);
                }
            }

            // Insert the new service clients
            for (const token of Object.keys(serviceClients)) {
                const name = serviceClients[token];
                const serviceClient = new AuthenticatedServiceClient(token, name);
                this._clients.set(serviceClient.token, serviceClient);
            }
        }
        catch (error) {
            throw new ServerErrorException("Error reading client token data.");
        }
    }


}