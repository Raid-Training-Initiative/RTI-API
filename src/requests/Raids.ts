/**
 * File for classes that handle requests for raids.
 */

import { IRaidEventDocument } from "@RTIBot-DB/documents/IRaidEventDocument";
import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import HTTPRequest from "./HTTPRequest";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import Utils from "../util/Utils";
import escapeStringRegexp = require("escape-string-regexp");
import DB from "../util/DB";

export class ListRaids extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "status",
        "name",
        "comp",
        "leader",
        "published",
        "format"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public async validate_request() {
        await super.validate_request();

        if (this.req.query["status"]) {
            const statusString: string = this.req.query["status"]?.toString().toLowerCase();
            if (statusString != "draft" && statusString != "published" && statusString != "archived") {
                throw new BadSyntaxException("Query parameter status must be either draft, published, or archived.");
            }
        }
        if (this.req.query["published"]) {
            const publishedString: string = this.req.query["published"]?.toString().toLowerCase();
            if (publishedString != "true" && publishedString != "false") {
                throw new BadSyntaxException("Query parameter published must be either true or false.");
            }
        }
        if (this.req.query["format"]) {
            const formatString: string = this.req.query["format"]?.toString().toLowerCase();
            if (formatString != "csv" && formatString != "json") {
                throw new BadSyntaxException("Query parameter format must be either csv or json.");
            }
        }
    }

    /**
     * Returns the JSON (or CSV) string payload of a list of raids after making a GET /raids request.
     * @throws {ResourceNotFoundException} When a comp specified in the comp query parameter does not exist.
     */
    public async send_response(): Promise<void> {
        const documents = await DB.queryRaids(await this.db_filter());

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.leaderId));
        const idMap: Map<string, string> = await Utils.getMemberIdMap(idArray);
        
        let payload: string = "";
        let formattedDocuments: Object[];
        if ((this.req.query["format"]) && (this.req.query["format"].toString().toLowerCase() == "csv")) {
            formattedDocuments = documents.map(document => {
                return idMap.get(document.leaderId) + "," + document.name + ","
                    + document.startTime.toISOString().split("T")[0] + ","
                    + document.startTime.toISOString().split("T")[1].replace(/:\d+\.\d+Z/, "");
            });
            payload = formattedDocuments.join("\n");
        }
        else {
            formattedDocuments = documents.map(document => {
                return {
                    name: document.name,
                    status: document.status,
                    startTime: document.startTime.toJSON().toString().replace(/\.\d+Z/, ""),
                    endTime: document.endTime.toJSON().toString().replace(/\.\d+Z/, ""),
                    leader: idMap.get(document.leaderId),
                    comp: document.compositionName,
                    publishedDate: document.publishedDate,
                    id: document._id
                };
            });
            payload = JSON.stringify(formattedDocuments);
        }
        
        let filterString: string = "";
        this.validRequestQueryParameters.forEach(queryParam => {
            if (this.req.query[queryParam]) {
                filterString += `${queryParam}: ${this.req.query[queryParam]} | `;
            }
        });
        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} raids in payload with ${filterString.length > 0 ? "filter - " + filterString : "no filter"}`);
        this.res.set("Content-Type", `application/${this.req.query["format"] ? this.req.query["format"].toString().toLowerCase() : "json"}`); // Set to application/csv if specified.
        this.res.send(payload);
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @returns A filter to pass into the database query.
     */
    private async db_filter(): Promise<Object> {
        const filters: Object[] = [];
        if (this.req.query["status"]) {
            const escapedStatus: string = escapeStringRegexp(this.req.query["status"].toString());
            const regex: RegExp = new RegExp(escapedStatus, "gi");
            filters.push({ status: regex });
        }
        if (this.req.query["name"]) {
            const regex: RegExp = /[-!$%^&*()_+|~=`{}[\]:";'<>?,./\s]+/gi;
            const escapedName: string = escapeStringRegexp(this.req.query["name"].toString());
            const strippedName: string = escapedName.replace(regex, "").toLowerCase();
            filters.push({ $where: `this.name.replace(/${regex.source}/gi, '').toLowerCase().includes('${strippedName}')` });
        }
        if (this.req.query["comp"]) {
            const escapedComp: string = escapeStringRegexp(this.req.query["comp"].toString());
            const regex: RegExp = new RegExp(escapedComp, "gi");
            filters.push({ compositionName: regex });
        }
        if (this.req.query["leader"]) {
            const idMap = await Utils.matchesNameIdMap(this.req.query["leader"].toString());
            filters.push({ leaderId: { $in: Array.from(idMap.keys()) }});
        }
        if (this.req.query["published"]) {
            const publishedString = this.req.query["published"].toString().toLowerCase();
            filters.push({ publishedDate: { "$exists" : publishedString == "true" }});
        }
        
        return filters.length > 0 ? { "$and": filters } : {};
    }
}

export class GetRaid extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "names"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Perform specific validation for this endpoint.
     * @throws When the names query parameter exists and it's not a supported value.
     */
    public async validate_request() {
        await super.validate_request();

        if (this.req.query["names"]) {
            const nameString: string = this.req.query["names"]?.toString().toLowerCase();
            if (nameString != "discord" && nameString != "gw2") {
                throw new BadSyntaxException("Query parameter names must be either discord or gw2.");
            }
        }
    }

    /**
     * Returns the JSON string payload of a raid after making a GET /raids/:id request.
     * @throws {ResourceNotFoundException} When the raid cannot be found.
     */
    public async send_response() {
        const document = await DB.queryRaid(this.req.params["id"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["id"])
        }

        // Resolve the IDs to names.
        const idArray: string[] = [];
        document.roles.forEach(role => {
            role.participants.forEach(participant => idArray.push(participant));
            role.reserves.forEach(reserve => idArray.push(reserve));
        });
        let idMap: Map<string, string> = new Map<string, string>();
        if (this.req.query["names"] && this.req.query["names"].toString().toLowerCase() == "GW2") {
            idMap = await Utils.getMemberIdMap(idArray, true);
        }
        else {
            idMap = await Utils.getMemberIdMap(idArray);
        }
        const leaderDiscordName = (await Utils.getMemberIdMap([document.leaderId])).get(document.leaderId);

        const formattedDocument = {
            id: document._id,
            name: document.name,
            description: document.description,
            status: document.status,
            startTime: document.startTime.toJSON().toString().replace(/\.\d+Z/, ""),
            endTime: document.endTime.toJSON().toString().replace(/\.\d+Z/, ""),
            leader: leaderDiscordName,
            comp: document.compositionName,
            channelId: document.channelId,
            participants: document.roles.map(role => {
                return {
                    role: role.name,
                    requiredParticipants: role.requiredParticipants,
                    members: role.participants.map(participant => idMap.get(participant))
                };
            }),
            reserves: document.roles.map(role => {
                return {
                    role: role.name,
                    members: role.reserves.map(reserve => idMap.get(reserve))
                };
            })
        };

        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending one raid in payload with ID ${this.req.params["id"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}

export class GetRaidLog extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "names"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Perform specific validation for this endpoint.
     * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
     */
    public async validate_request() {
        await super.validate_request();

        if (this.req.query["names"]) {
            const nameString: string = this.req.query["names"]?.toString().toLowerCase();
            if (nameString != "DISCORD" && nameString != "GW2") {
                throw new BadSyntaxException("Query parameter names must be either discord or gw2.");
            }
        }
    }

    /**
     * Returns the JSON string payload of a raid log after making a GET /raids/:id.log request.
     */
    public async send_response() {
        const document = (await this.db.raidEventModel.findOne({_id: this.req.params["id"]}).exec()) as IRaidEventDocument;
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["id"])
        }

        // Resolve the IDs to names.
        const idArray: string[] = [];
        document.log.forEach(log => {
            idArray.push(log.data.user ? log.data.user : log.data);
        });
        let idMap: Map<string, string> = new Map<string, string>();
        if (this.req.query["names"] && this.req.query["names"].toString().toLowerCase() == "GW2") {
            idMap = await Utils.getMemberIdMap(idArray, true);
        }
        else {
            idMap = await Utils.getMemberIdMap(idArray);
        }

        const formattedDocument = document.log.map(log => {
            return {
                date: log.date,
                type: log.type,
                data: {
                    user: idMap.get(log.data.user ? log.data.user : log.data),
                    roleName: log.data.roleName,
                    isReserve: log.data.isReserve
                }
            }
        });

        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending one raid in payload with ID ${this.req.params["id"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}