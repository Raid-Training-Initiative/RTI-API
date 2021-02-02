import "module-alias/register";
import { IConfig } from "./Config";
import express = require("express");
import { Request, Response, NextFunction } from "express";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { GetComp, ListComps } from "./requests/Comps";
import errorMiddleware from "./middleware/error.middleware";
import ResourceNotFoundException from "./exceptions/ResourceNotFoundException";
import Auth from "./Auth";

export class App {
    private static _app: App | undefined;
    
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

    constructor(private readonly config: IConfig) {
    }

    /**
     * This function runs the API and listens for the different endpoints.
     */
    public async run() {
        const server = express();
        const port = 8080;
        const db = new MongoDatabase(this.config.db, this.config.guildId);
        
        Auth.Instance;
        await db.connect();

        server.get("/comps", async (req: Request, res: Response, next: NextFunction) => {
            const listComps = new ListComps(req, res, next, db);
            listComps.run();
        });

        server.get("/comps/:comp", async (req: Request, res: Response, next: NextFunction) => {
            const getComp = new GetComp(req, res, next, db);
            getComp.run();
        });

        server.get("*", async (req: Request, res: Response, next: NextFunction) => {
            next(new ResourceNotFoundException(req.url))
        });

        // Start the Express server.
        server.listen(port, () => {
            console.log(`server started at http://localhost:${ port }`);
        });

        server.use(errorMiddleware);
    }
}

/**
 * This function loads the correct config file depending on the argument passed / environemnt property value.
 * @returns Returns the config file that will be in use.
 */
function load_configuration(): IConfig | null {
    let config: string | undefined = process.argv[2];
    if (!config) {
        config = process.env.CONFIG;
    }
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
