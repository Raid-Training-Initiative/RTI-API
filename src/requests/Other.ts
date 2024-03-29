/**
 * File for classes that handle other requests.
 */

import { NextFunction, Request, Response } from "express";
import Utils from "../util/Utils";
import { IConfig } from "../util/Config";
import ServerErrorException from "../exceptions/ServerErrorException";
import * as os from "os";
import DB from "../util/DB";
import moment = require("moment-timezone");
import momentDurationFormatSetup = require("moment-duration-format");
import HTTPGetRequest from "./base/HTTPGetRequest";
import { existsSync } from "fs";
import { join } from "path";
momentDurationFormatSetup(moment);

export class GetStatus extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];
    private readonly _config: IConfig;

    constructor(
        req: Request,
        res: Response,
        next: NextFunction,
        _config: IConfig,
    ) {
        super(req, res, next);
        this._config = _config;
    }

    /**
     * Returns information about the API after a get status request.
     * @throws {ServerErrorException} When the package.json file could not be loaded.
     * @returns An object representing information about the API.
     */
    public async prepareResponse(): Promise<Object> {
        let packageJson: any | undefined = undefined;

        try {
            let prefix: string = "../../../";
            if (!existsSync(join(__dirname, prefix, "package.json"))) {
                prefix = "../../";
            }
            packageJson = require(`${prefix}package.json`);
        } catch (Exception) {
            throw new ServerErrorException("Error loading package.json");
        }

        const statusObject = {
            timestamp: Date.now(),
            processInfo: {
                uptime: moment
                    .duration(process.uptime(), "seconds")
                    .format(
                        "Y [years] M [months] D [days] h [hours] m [minutes] s [seconds]",
                    ),
                pid: process.pid,
                title: process.title,
                environment: process.argv[2],
            },
            apiInfo: {
                apiName: packageJson.name,
                apiVersion: packageJson.version,
                guildId: this._config.guildId,
                gitVersionInfo: Utils.getCommitInfo(),
            },
            systemInfo: {
                platform: process.platform,
                type: os.type(),
                hostname: os.hostname(),
                release: os.release(),
                memory: os.totalmem(),
                cores: os.cpus().length,
            },
        };

        return statusObject;
    }
}

export class GetStats extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns statistics about the data after a get stats request.
     * @returns An object representing statistics about the data.
     */
    public async prepareResponse(): Promise<Object> {
        const statsObject = {
            comps: {
                count: await DB.queryCompsCount(),
            },
            categories: {
                count: await DB.queryCategoriesCount(),
            },
            raids: {
                count: await DB.queryRaidsCount(),
                countPublished: await DB.queryRaidsCount({
                    publishedDate: { $exists: true },
                }),
            },
            members: {
                count: await DB.queryMembersCount(),
            },
            trainingRequests: {
                count: await DB.queryTrainingRequestsCount(),
                countActive: await DB.queryTrainingRequestsCount({
                    active: true,
                }),
            },
        };

        return statsObject;
    }
}
