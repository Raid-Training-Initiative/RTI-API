import "module-alias/register";
import { IConfig } from "./Config";
import express = require("express");
import { Document } from "mongoose";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { Comps } from "./endpoints/Comps";

export interface IUserDocument extends Document {
    name: string;
}

export class App {
    public static initiate(config: IConfig) {
        if (!this._app) {
            this._app = new App(config);
        }
    }

    public static instance() {
        if (!this._app) {
            throw Error("App instance not defined");
        }
        return this._app;
    }

    private static _app: App | undefined;

    constructor(private readonly config: IConfig) {
    }

    public async run() {
        const server = new express();
        const port = 8080;
        const db = new MongoDatabase(this.config.db, this.config.guildId);
        await db.connect();

        // define a route handler for the default home page
        server.get("/comps", async (req, res) => {
            res.set("Content-Type", "application/json");
            res.send(await Comps.list_payload(db));
        });

        server.get("/test2", (req, res) => {
            res.send("Hello test 2!");
        });

        // start the Express server
        server.listen(port, () => {
            console.log(`server started at http://localhost:${ port }`);
        });
    }
}

function load_configuration(): IConfig | null {
    let config: string | undefined = process.argv[2];
    if (!config) { config = process.env.CONFIG; }
    if (!config) {
        console.log("No configuration specified.");
        return null;
    }
    console.log(`Using config '${config}'.`);
    let confFile: string;
    switch (config) {
        case "Release":
            confFile = "../../Config.json";
            break;
        case "Debug":
            confFile = "../../ConfigDebug.json";
            break;
        default:
            console.log("Invalid configuration name.");
            return null;
    }
    return require(confFile);
}

process.on("uncaughtException", (error) => console.log(error));
const conf = load_configuration();
if (conf) {
    App.initiate(conf);
    App.instance().run();
}
