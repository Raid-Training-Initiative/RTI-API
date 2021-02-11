import "module-alias/register";
import { IConfig } from "./util/Config";
import express = require("express");
import { Request, Response, NextFunction } from "express";
import error_middleware from "./util/Error.middleware";
import ResourceNotFoundException from "./exceptions/ResourceNotFoundException";
import Auth from "./util/Auth";
import { Logger, Severity } from "./util/Logger";
import { GetComp, ListComps } from "./requests/Comps";
import { GetCategory, ListCategories } from "./requests/Categories";
import { GetRaid, ListRaids, GetRaidLog } from "./requests/Raids";
import { GetMember, ListMembers } from "./requests/Members";
import DB from "./util/DB";

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

    constructor(private readonly _config: IConfig) {}

    /**
     * Runs the API and listens for the different endpoints.
     */
    public async run() { 
        const server = express();
        const port = 8080;
        Logger.log(Severity.Info, `Initialising API with DB ${this._config.db}`);

        await DB.create(this._config);
        await Auth.create(this._config);
        
        // =========### Raids ###=========
        server.get("/raids", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /raids request initiated`);
            const listRaids = new ListRaids(req, res, next);
            await listRaids.run();
            Logger.log(Severity.Info, `GET /raids request completed`);
        });

        server.get("/raids/:id", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /raids/:id request initiated`);
            const getRaid = new GetRaid(req, res, next);
            await getRaid.run();
            Logger.log(Severity.Info, `GET /raids/:id request completed`);
        });

        server.get("/raids/:id/log", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /raids/:id/log request initiated`);
            const getRaidLog = new GetRaidLog(req, res, next);
            await getRaidLog.run();
            Logger.log(Severity.Info, `GET /raids/:id/log request completed`);
        });

        // =========### Members ###=========
        server.get("/members", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /members request initiated`);
            const listMembers = new ListMembers(req, res, next);
            await listMembers.run();
            Logger.log(Severity.Info, `GET /members request completed`);
        });

        server.get("/members/:discordid", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /members/:discordid request initiated`);
            const getMember = new GetMember(req, res, next);
            await getMember.run();
            Logger.log(Severity.Info, `GET /members/:discordid request completed`);
        });

        // =========### Comps ###=========
        server.get("/comps", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /comps request initiated`);
            const listComps = new ListComps(req, res, next);
            await listComps.run();
            Logger.log(Severity.Info, `GET /comps request completed`);
        });

        server.get("/comps/:comp", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /comps/:comp request initiated`);
            const getComp = new GetComp(req, res, next);
            await getComp.run();
            Logger.log(Severity.Info, `GET /comps/:comp request completed`);
        });

        // =========### Categories ###=========
        server.get("/categories", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /categories request initiated`);
            const listComps = new ListCategories(req, res, next);
            await listComps.run();
            Logger.log(Severity.Info, `GET /categories request completed`);
        });

        server.get("/categories/:category", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /categories/:category request initiated`);
            const getComp = new GetCategory(req, res, next);
            await getComp.run();
            Logger.log(Severity.Info, `GET /categories/:category request completed`);
        });

        // =========### Other ###=========
        server.get("*", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `Request made to nonexistent resource`);
            next(new ResourceNotFoundException(req.url))
        });

        // Start the Express server.
        server.listen(port, () => {
            Logger.log(Severity.Info, `Server started at http://localhost:${port}`);
        });

        server.use(error_middleware);
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
        Logger.log(Severity.Error, "No configuration specified");
        return null;
    }
    Logger.log(Severity.Info, `Using config '${config}'.`);

    let confFile: string;
    switch (config) {
        case "Release":
            confFile = "../../Config.json";
            break;
        case "Debug":
            confFile = "../../ConfigDebug.json";
            break;
        default:
            Logger.log(Severity.Error, "Invalid configuration name");
            return null;
    }

    return require(confFile);
}

process.on("uncaughtException", (error) => Logger.log_error(Severity.Error, error));
const conf = load_configuration();
if (conf) {
    App.initiate(conf);
    App.instance().run();
}
