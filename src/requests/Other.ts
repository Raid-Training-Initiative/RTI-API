/**
 * File for classes that handle other requests.
 */

import { NextFunction, Request, Response } from "express";
import Utils from "../util/Utils";
import { Logger, Severity } from "../util/Logger";
import HTTPRequest from "./base/HTTPRequest";
import { IConfig } from "../util/Config";
import ServerErrorException from "../exceptions/ServerErrorException";
import * as os from "os";

export class GetStatus extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];
    private readonly _config: IConfig;

    constructor(req: Request, res: Response, next: NextFunction, _config: IConfig) {
        super(req, res, next);
        this._config = _config;
    }

    /**
     * Returns the JSON string payload of information about the API after a get status request.
     */
    public async send_response(): Promise<void> {
        let packageJson: any;
        try {
            packageJson = require("../../../package.json");
        } catch (Exception) {
            throw new ServerErrorException("Error loading package.json");
        }
        
        const statusObject = {
            timestamp: Date.now(),
            processInfo: {
                uptime: process.uptime(),
                pid: process.pid,
                title: process.title,
                environment: process.argv[2]
            },
            apiInfo: {
                apiName: packageJson.name,
                apiVersion: packageJson.version,
                guildId: this._config.guildId,
                gitVersionInfo: Utils.get_commit_info()
            },
            systemInfo: {
                platform: process.platform,
                type: os.type(),
                hostname: os.hostname(),
                release: os.release(),
                memory: os.totalmem(),
                cores: os.cpus().length
            }
        };
        
        Logger.log_request(Severity.Debug, this.timestamp, `Sending status`);
        const payload = JSON.stringify(statusObject);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}