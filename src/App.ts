import "module-alias/register";
import { IConfig } from "./util/Config";
import express = require("express");
import { Request, Response, NextFunction } from "express";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import errorMiddleware from "./util/Error.middleware";
import ResourceNotFoundException from "./exceptions/ResourceNotFoundException";
import Auth from "./util/Auth";
import { Logger, Severity } from "./util/Logger";
import { GetComp, ListComps } from "./requests/Comps";
import { GetCategory, ListCategories } from "./requests/Categories";
import { GetRaid, ListRaids } from "./requests/Raids";

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

    constructor(private readonly _config: IConfig) {
    }

    /**
     * Runs the API and listens for the different endpoints.
     */
    public async run() { 
        const server = express();
        const port = 8080;
        const db = new MongoDatabase(this._config.db, this._config.guildId);
        Logger.Log(Severity.Info, `Initialising API with DB ${this._config.db}`);

        await db.connect();
        await Auth.create(this._config);
        
        // =========### Comps ###=========
        server.get("/comps", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `GET /comps request initiated`);
            const listComps = new ListComps(req, res, next, db);
            await listComps.run();
            Logger.Log(Severity.Info, `GET /comps request completed`);
        });

        server.get("/comps/:comp", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `GET /comps/:comp request initiated`);
            const getComp = new GetComp(req, res, next, db);
            await getComp.run();
            Logger.Log(Severity.Info, `GET /comps/:comp request completed`);
        });

        // =========### Categories ###=========
        server.get("/categories", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `GET /categories request initiated`);
            const listComps = new ListCategories(req, res, next, db);
            await listComps.run();
            Logger.Log(Severity.Info, `GET /categories request completed`);
        });

        server.get("/categories/:category", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `GET /categories/:category request initiated`);
            const getComp = new GetCategory(req, res, next, db);
            await getComp.run();
            Logger.Log(Severity.Info, `GET /categories/:category request completed`);
        });

        // =========### Raids ###=========
        server.get("/raids", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `GET /raids request initiated`);
            const listRaids = new ListRaids(req, res, next, db);
            await listRaids.run();
            Logger.Log(Severity.Info, `GET /raids request completed`);
        });

        server.get("/raids/:id", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `GET /raids/:id request initiated`);
            const getRaid = new GetRaid(req, res, next, db);
            await getRaid.run();
            Logger.Log(Severity.Info, `GET /raids/:id request completed`);
        });

        // =========### Other ###=========
        server.get("*", async (req: Request, res: Response, next: NextFunction) => {
            Logger.Log(Severity.Info, `Request made to nonexistent resource`);
            next(new ResourceNotFoundException(req.url))
        });

        // Start the Express server.
        server.listen(port, () => {
            Logger.Log(Severity.Info, `Server started at http://localhost:${port}`);
        });

        server.use(errorMiddleware);
    }
}

/**
 * Loads the correct config file depending on the argument passed / environment property value.
 * @returns Returns the config file that will be in use.
 */
function load_configuration(): IConfig | null {
    let config: string | undefined = process.argv[2];
    if (!config) {
        config = process.env.CONFIG;
    }
    if (!config) {
        Logger.Log(Severity.Error, "No configuration specified");
        return null;
    }
    Logger.Log(Severity.Info, `Using config '${config}'.`);

    let confFile: string;
    switch (config) {
        case "Release":
            confFile = "../../Config.json";
            break;
        case "Debug":
            confFile = "../../ConfigDebug.json";
            break;
        default:
            Logger.Log(Severity.Error, "Invalid configuration name");
            return null;
    }

    return require(confFile);
}

process.on("uncaughtException", (error) => Logger.LogError(Severity.Error, error));
const conf = load_configuration();
if (conf) {
    App.initiate(conf);
    App.instance().run();
}
