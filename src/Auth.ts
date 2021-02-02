import * as fs from "fs";
import ServerErrorException from "./exceptions/ServerErrorException";

const clientFile = "./clients.json"; // A JSON object of key/value pairs, where the key is the client secret and the value is the client ID. 

export default class Auth {
    private static _instance: Auth;
    private clients: Map<string, string>;

    private constructor() {
        this.import_clients();
        fs.watch(clientFile, (eventType, filename) => {
            if (eventType == "change") {
                this.import_clients();
            }
        });
    }

    /**
     * This method reads the clients.json file and imports it into the clients object.
     */
    private import_clients() {
        fs.readFile(clientFile, "utf-8", (error, data) => {
            if (error) {
                throw new ServerErrorException("Error reading client token data.")
            } else {
                this.clients = JSON.parse(data.toString());
            }
        });
    }

    /**
     * Takes a client secret and returns a client ID or undefined if the secret was invalid.
     * @param client_secret The client secret.
     * @returns A string of the client_id that it succeeded in finding, or undefined if the secret was invalid.
     */
    public return_client_id(client_secret: string): string | undefined {
        return this.clients[client_secret];
    }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}