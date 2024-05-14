/**
 * File for classes that handle other requests.
 */

import { NextFunction, Request, Response } from "express";
import { IConfig } from "../util/Config";
import ServerErrorException from "../exceptions/ServerErrorException";

import DB from "../util/DB";

import HTTPGetRequest from "./base/HTTPGetRequest";
import { existsSync } from "fs";
import { join } from "path";
import { OtherStatsDto, OtherStatusDto } from "./dto/other.dto";

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
    public async prepareResponse(): Promise<OtherStatusDto> {
        try {
            let prefix: string = "../../../";
            if (!existsSync(join(__dirname, prefix, "package.json"))) {
                prefix = "../../";
            }
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const packageJson: Record<string, string> = require(
                `${prefix}package.json`,
            );
            return OtherStatusDto.fromJson(packageJson, this._config.guildId);
        } catch (Exception) {
            throw new ServerErrorException("Error loading package.json");
        }
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
    public async prepareResponse(): Promise<OtherStatsDto> {
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
