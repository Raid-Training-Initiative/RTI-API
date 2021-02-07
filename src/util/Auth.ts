import { promises as filepromises, watch as filewatch } from "fs";
import ServerErrorException from "../exceptions/ServerErrorException";

const clientFile = "./clients.json"; // A JSON object of key/value pairs, where the key is the client secret and the value is the client ID. 

export default class Auth {
    private static _instance: Auth;
    private clients: Map<string, string>;

    private constructor() {
        filewatch(clientFile, (eventType, filename) => {
            if (eventType == "change") {
                this.import_clients();
            }
        });
    }

    /**
     * This method reads the clients.json file and imports it into the clients object.
     */
    private async import_clients() {
        try {
            const fileContent = await filepromises.readFile(clientFile, "utf-8");
            this.clients = JSON.parse(fileContent.toString());
        }
        catch (error) {
            throw new ServerErrorException("Error reading client token data.");
        }
    }

    /**
     * Takes a client secret and returns a client ID or undefined if the secret was invalid.
     * @param client_secret The client secret.
     * @returns A string of the client_id that it succeeded in finding, or undefined if the secret was invalid.
     */
    public return_client_id(client_secret: string): string | undefined {
        return this.clients[client_secret];
    }

    public static async create() {
        if (!this._instance) {
            this._instance = new this()
            await this._instance.import_clients();
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