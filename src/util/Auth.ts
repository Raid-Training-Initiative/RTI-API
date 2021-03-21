import { promises as filepromises, watch as filewatch } from "fs";
import ServerErrorException from "../exceptions/ServerErrorException";
import { IConfig } from "./Config";

export default class Auth {
    private static _instance: Auth;
    private clients: Map<string, string>;

    private constructor(private readonly _config: IConfig) {
        filewatch(this._config.clientsFile, (eventType, filename) => {
            if (eventType == "change") {
                this.importClients();
            }
        });
    }

    /**
     * Reads the clients.json file and imports it into the clients object.
     */
    private async importClients() {
        try {
            // The clients file contains a JSON object of key/value pairs, where the key is the client secret and the value is the client ID. 
            const fileContent = await filepromises.readFile(this._config.clientsFile, "utf-8");
            this.clients = JSON.parse(fileContent.toString());
        }
        catch (error) {
            throw new ServerErrorException("Error reading client token data.");
        }
    }

    /**
     * Takes a client secret and returns a client ID or undefined if the secret was invalid.
     * @param clientSecret The client secret.
     * @returns A string of the clientId that it succeeded in finding, or undefined if the secret was invalid.
     */
    public returnClientId(clientSecret: string): string | undefined {
        return this.clients[clientSecret];
    }

    public static async create(config: IConfig) {
        if (!this._instance) {
            this._instance = new this(config)
            await this._instance.importClients();
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
}