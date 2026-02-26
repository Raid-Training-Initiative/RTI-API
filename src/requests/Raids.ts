/**
 * File for classes that handle requests for raids.
 */

import { IRaidEventModel } from "@RTIBot-DB/schemas/RaidEventSchema";
import { NextFunction, Request, Response } from "express";
import { FilterQuery } from "mongoose";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import DB from "../util/DB";
import Utils, { PaginatedResponse } from "../util/Utils";
import HTTPGetRequest from "./base/HTTPGetRequest";
import { RaidDto, RaidLogDto, RaidSummaryDto } from "./dto/raid.dto";

export class ListRaids extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [
        "status",
        "nameInclude",
        "nameExclude",
        "comps",
        "leader",
        "published",
        "participants",
        "reserves",
        "format",
        "page",
        "pageSize",
        "dateFrom",
        "dateTo",
        "showParticipants",
    ];

    private showParticipants = false;
    private filterQuery: {
        status?: ("draft" | "published" | "archived")[];
        published?: boolean;
        timestampFrom?: string;
        timestampTo?: string;
    };

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            paginated: true,
            multiFormat: true,
            authenticated: true,
        });

        this.filterQuery = {};
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value/format.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["status"]) {
            const statusStrings: string[] = this._req.query["status"]
                .toString()
                .toLowerCase()
                .split(",");
            statusStrings.forEach((statusString) => {
                if (
                    statusString != "draft" &&
                    statusString != "published" &&
                    statusString != "archived"
                ) {
                    throw new BadSyntaxException(
                        "Query parameter status must be either draft, published, or archived.",
                    );
                }
            });

            // todo: introduce type guard or just migrate to NextJS tbh
            this.filterQuery.status = statusStrings as (
                | "draft"
                | "published"
                | "archived"
            )[];
        }

        if (this._req.query["published"]) {
            const publishedString: string = this._req.query["published"]
                .toString()
                .toLowerCase();
            if (publishedString != "true" && publishedString != "false") {
                throw new BadSyntaxException(
                    "Query parameter published must be either true or false.",
                );
            }

            this.filterQuery.published = publishedString == "true";
        }
        if (this._req.query["dateFrom"] || this._req.query["dateTo"]) {
            const timestampFrom: string | undefined =
                this._req.query["dateFrom"]?.toString();
            const timestampTo: string | undefined =
                this._req.query["dateTo"]?.toString();
            const regex: RegExp =
                /^(19|20)\d\d-(0[1-9]|1[012])-([012]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/i;
            if (timestampFrom && !regex.test(timestampFrom)) {
                throw new BadSyntaxException(
                    "Query parameter dateFrom must be in the format yyyy-MM-ddTHH:mm:ss",
                );
            }
            if (timestampTo && !regex.test(timestampTo)) {
                throw new BadSyntaxException(
                    "Query parameter dateTo must be in the format yyyy-MM-ddTHH:mm:ss",
                );
            }
            if (
                timestampFrom &&
                timestampTo &&
                Date.parse(timestampFrom) > Date.parse(timestampTo)
            ) {
                throw new BadSyntaxException(
                    "Query parameter dateFrom must be set to a date before query parameter dateTo",
                );
            }

            this.filterQuery.timestampFrom = timestampFrom;
            this.filterQuery.timestampTo = timestampTo;
        }
        if (this._req.query["showParticipants"]) {
            const showParticipantsString: string = this._req.query[
                "showParticipants"
            ]
                .toString()
                .toLowerCase();
            if (
                showParticipantsString != "true" &&
                showParticipantsString != "false"
            ) {
                throw new BadSyntaxException(
                    "Query parameter showParticipants must be either true or false.",
                );
            }

            this.showParticipants = showParticipantsString == "true";
        }
    }

    /**
     * Returns a list of raids after making a GET /raids request.
     * @returns A list of objects representing raids.
     */
    public async prepareResponse(
        paginated: {
            page: number;
            pageSize: number;
        } = { page: 1, pageSize: 100 },
    ): Promise<PaginatedResponse<RaidSummaryDto, "raids"> | string[]> {
        const documents = await DB.queryRaids(await this.dbFilter(), paginated);

        const idArray = new Array<string>();
        if (this.showParticipants) {
            documents.forEach((document) =>
                document.roles.forEach((role) => {
                    role.participants.forEach((participant) =>
                        idArray.push(participant),
                    );
                }),
            );
        }
        documents.forEach((document) => idArray.push(document.leaderId));

        // Resolve the IDs to names.
        const idMap: Map<string, string | undefined> =
            await Utils.idsToMap(idArray);

        if (this.responseFormat == "csv") {
            return documents.map((document) => {
                return `"${idMap.get(document.leaderId)}","${document.name}","${
                    document.startTime.toISOString().split("T")[0]
                }","${document.startTime
                    .toISOString()
                    .split("T")[1]
                    .replace(/:\d+\.\d+Z/, "")}","${
                    document.compositionName
                }","${document._id}"`;
            });
        }

        return {
            totalElements: await DB.queryRaidsCount(await this.dbFilter()),
            raids: documents.map((document) =>
                RaidSummaryDto.fromDocument(
                    document,
                    idMap,
                    this.showParticipants,
                ),
            ),
        };
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @throws {ResourceNotFoundException} When the Discord name of the specified leader cannot be found in the database.
     * @returns A filter to pass into the database query.
     */
    private async dbFilter(): Promise<FilterQuery<IRaidEventModel>> {
        const filters: Record<string, unknown>[] = [];
        const stripRegex: RegExp = /[-!$%^&*()_+|~=`{}[\]:";'<>?,./\s]+/gi;
        const getSearchTerms = (queryString: string) =>
            queryString
                .toString()
                .split(",")
                .map((query) => {
                    const strippedName: string = query
                        .replace(stripRegex, "")
                        .toLowerCase();
                    return RegExp.escape(strippedName);
                });
        if (this.filterQuery.status !== undefined) {
            const filterStatus: RegExp[] = Utils.getReqexListFromStringList(
                this.filterQuery.status,
            );
            filters.push({ status: { $in: filterStatus } });
        }
        if (this._req.query["nameInclude"]) {
            const includeQueries: string[] = getSearchTerms(
                this._req.query["nameInclude"].toString(),
            );
            const regexFilters = includeQueries.map((query) => ({
                name: {
                    $regex: new RegExp(query.replace(stripRegex, ""), "gi"),
                },
            }));
            filters.push(...regexFilters);
        }
        if (this._req.query["nameExclude"]) {
            const excludeQueries: string[] = getSearchTerms(
                this._req.query["nameExclude"].toString(),
            );
            const regexFilters = excludeQueries.map((query) => ({
                name: {
                    $not: {
                        $regex: new RegExp(query.replace(stripRegex, ""), "gi"),
                    },
                },
            }));
            filters.push(...regexFilters);
        }
        if (this._req.query["comps"]) {
            const filterComps: RegExp[] = Utils.getRegexListFromQueryString(
                this._req.query["comps"].toString(),
            );
            filters.push({ compositionName: { $in: filterComps } });
        }
        if (this._req.query["leader"]) {
            const document = await DB.queryMemberByName(
                this._req.query["leader"].toString(),
            );
            if (document == undefined) {
                throw new ResourceNotFoundException(
                    this._req.query["leader"].toString(),
                );
            }
            filters.push({ leaderId: document.account.userId });
        }
        if (this.filterQuery.published !== undefined) {
            filters.push({
                publishedDate: { $exists: this.filterQuery.published },
            });
        }
        if (this._req.query["participants"]) {
            const filterParticipants: string[] = this._req.query["participants"]
                .toString()
                .split(",");
            const memberMap: Map<string | undefined, string> =
                await Utils.namesToMap(filterParticipants);
            filters.push({
                "roles.participants": {
                    $all: [...new Set(Array.from(memberMap.values()))],
                },
            });
        }
        if (this._req.query["reserves"]) {
            const filterParticipants: string[] = this._req.query["reserves"]
                .toString()
                .split(",");
            const memberMap: Map<string | undefined, string> =
                await Utils.namesToMap(filterParticipants);
            filters.push({
                "roles.reserves": {
                    $all: [...new Set(Array.from(memberMap.values()))],
                },
            });
        }
        if (this.filterQuery.timestampFrom) {
            filters.push({
                startTime: {
                    $gte: this.filterQuery.timestampFrom,
                },
            });
        }
        if (this.filterQuery.timestampTo) {
            filters.push({
                startTime: {
                    $lte: this.filterQuery.timestampTo,
                },
            });
        }

        return filters.length > 0 ? { $and: filters } : {};
    }
}

export class GetRaid extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = ["names"];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Perform specific validation for this endpoint.
     * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["names"]) {
            const nameString: string = this._req.query["names"]
                ?.toString()
                .toLowerCase();
            if (nameString != "discord" && nameString != "gw2") {
                throw new BadSyntaxException(
                    "Query parameter names must be either discord or gw2.",
                );
            }
        }
    }

    /**
     * Returns a raid after making a GET /raids/:id request.
     * @throws {ResourceNotFoundException} When the raid cannot be found.
     * @returns An object representing a raid.
     */
    public async prepareResponse(): Promise<RaidDto> {
        const document = await DB.queryRaid(this._req.params["id"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["id"]);
        }

        // Resolve the IDs to names.
        const idArray: string[] = [];
        document.roles.forEach((role) => {
            role.participants.forEach((participant) =>
                idArray.push(participant),
            );
        });
        document.interested.forEach((int) => {
            idArray.push(int.userId);
        });
        Array.from(document.guestGW2Names?.keys() ?? []).forEach((guest) => {
            idArray.push(guest);
        });
        idArray.push(document.leaderId);
        idArray.push(...document.coLeaderIds);

        let idMap: Map<string, string | undefined>;
        if (
            this._req.query["names"] &&
            this._req.query["names"].toString().toLowerCase() == "gw2"
        ) {
            idMap = await Utils.idsToMap(idArray, { returnGW2Names: true });
        } else {
            idMap = await Utils.idsToMap(idArray);
        }

        return RaidDto.fromDocument(document, idMap);
    }
}

export class GetRaidLog extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = ["names"];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Perform specific validation for this endpoint.
     * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["names"]) {
            const nameString: string = this._req.query["names"]
                ?.toString()
                .toLowerCase();
            if (nameString != "discord" && nameString != "gw2") {
                throw new BadSyntaxException(
                    "Query parameter names must be either discord or gw2.",
                );
            }
        }
    }

    /**
     * Returns a raid log after making a GET /raids/:id.log request.
     * @throws {ResourceNotFoundException} When the raid cannot be found.
     * @returns An object representing a raid log.
     */
    public async prepareResponse(): Promise<RaidLogDto[]> {
        const document = await DB.queryRaid(this._req.params["id"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["id"]);
        }

        // Resolve the IDs to names.
        const idArray: string[] = [];
        document.log.forEach((log) => {
            if (log.users) {
                idArray.push(...log.users);
            }
        });
        let idMap: Map<string, string | undefined>;
        if (
            this._req.query["names"] &&
            this._req.query["names"].toString().toLowerCase() == "GW2"
        ) {
            idMap = await Utils.idsToMap(idArray, { returnGW2Names: true });
        } else {
            idMap = await Utils.idsToMap(idArray);
        }

        return document.log.map((log) => RaidLogDto.fromLog(log, idMap));
    }
}
