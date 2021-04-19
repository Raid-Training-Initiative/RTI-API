import "module-alias/register";
import { IConfig } from "./util/Config";
import express = require("express");
import DB from "./util/DB";
import { Request, Response, NextFunction } from "express";
import errorMiddleware from "./util/Error.middleware";
import ResourceNotFoundException from "./exceptions/ResourceNotFoundException";
import Auth from "./util/auth/Auth";
import { Logger, Severity } from "./util/Logger";
import { CreateComp, DeleteComp, GetComp, ListComps } from "./requests/Comps";
import { GetCategory, ListCategories } from "./requests/Categories";
import { GetRaid, ListRaids, GetRaidLog } from "./requests/Raids";
import { GetMember, ListMembers } from "./requests/Members";
import { ListTrainingRequests, GetTrainingRequest } from "./requests/TrainingRequests";
import { GetStats, GetStatus } from "./requests/Other";
import { GetGuildOptions } from "./requests/GuildOptions";
import { PostDiscordAuth } from "./requests/DiscordAuth";

export class App {
    private static _app: App | undefined;
    private _config: IConfig;
    
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

    constructor(_config: IConfig) {
        this._config = _config;
    }

    /**
     * Runs the API and listens for the different endpoints.
     */
    public async run() { 
        const server = express();
        if (this._config.cors) {
            const cors = require('cors');
            server.use(cors());
        }
        const port = 8080;
        Logger.log(Severity.Info, `Initialising API with DB ${this._config.db}`);

        await DB.create(this._config);
        await Auth.create(this._config);

        server.use(express.json());
                
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

        server.post("/comps", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `POST /comps request initiated`);
            const createComp = new CreateComp(req, res, next);
            await createComp.run();
            Logger.log(Severity.Info, `POST /comps request completed`);
        });

        server.delete("/comps/:comp", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `DELETE /comps/:comp request initiated`);
            const deleteComp = new DeleteComp(req, res, next);
            await deleteComp.run();
            Logger.log(Severity.Info, `DELETE /comps/:comp request completed`);
        });

        // =========### Categories ###=========
        server.get("/categories", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /categories request initiated`);
            const listCategories = new ListCategories(req, res, next);
            await listCategories.run();
            Logger.log(Severity.Info, `GET /categories request completed`);
        });

        server.get("/categories/:category", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /categories/:category request initiated`);
            const getCategory = new GetCategory(req, res, next);
            await getCategory.run();
            Logger.log(Severity.Info, `GET /categories/:category request completed`);
        });

        // =========### TrainingRequests ###=========
        server.get("/trainingrequests", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /trainingrequests request initiated`);
            const listTrainingRequests = new ListTrainingRequests(req, res, next);
            await listTrainingRequests.run();
            Logger.log(Severity.Info, `GET /trainingrequests request completed`);
        });

        server.get("/trainingrequests/:userid", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /trainingrequests/:userid request initiated`);
            const getTrainingRequest = new GetTrainingRequest(req, res, next);
            await getTrainingRequest.run();
            Logger.log(Severity.Info, `GET /trainingrequests/:userid request completed`);
        });

        // =========### GuildOptions ###=========
        server.get("/guildoptions", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /guildoptions request initiated`);
            const getGuildOptions = new GetGuildOptions(req, res, next);
            await getGuildOptions.run();
            Logger.log(Severity.Info, `GET /guildoptions request completed`);
        });

        // =========### Discord Auth ###=========
        server.post("/discordauth", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `POST /discordauth request initiated`);
            const discordAuth = new PostDiscordAuth(req, res, next);
            await discordAuth.run();
            Logger.log(Severity.Info, `POST /discordauth request completed`);
        });

        // =========### Other ###=========
        server.get("/status", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /status request initiated`);
            const getStatus = new GetStatus(req, res, next, this._config);
            await getStatus.run();
            Logger.log(Severity.Info, `GET /status request completed`);
        });

        server.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `GET /stats request initiated`);
            const getStats = new GetStats(req, res, next);
            await getStats.run();
            Logger.log(Severity.Info, `GET /stats request completed`);
        });

        server.all("*", async (req: Request, res: Response, next: NextFunction) => {
            Logger.log(Severity.Info, `Request made to nonexistent resource`);
            next(new ResourceNotFoundException(req.url))
        });

        // Start the Express server.
        server.listen(port, () => {
            Logger.log(Severity.Info, `Server started at http://localhost:${port}`);
        });

        server.use(errorMiddleware);
    }
}

/**
 * Loads the correct config file depending on the argument passed / environment property value.
 * @returns Returns the config file that will be in use.
 */
function loadConfiguration(): IConfig | null {
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

process.on("uncaughtException", (error) => Logger.logError(Severity.Error, error));
const conf = loadConfiguration();
if (conf) {
    App.initiate(conf);
    App.instance().run();
}
