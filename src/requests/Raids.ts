/**
 * File for classes that handle requests for raids.
 */

import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import HTTPRequest from "./base/HTTPRequest";
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
        "format",
        "page",
        "pageSize"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: true});
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
    public async send_response(paginated?: {page: number, pageSize: number}): Promise<void> {
        const documents = await DB.query_raids(await this.db_filter(), paginated);

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.leaderId));
        const idMap: Map<string, string> = await Utils.get_member_id_map(idArray);
        
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
                    startTime: Utils.format_date_string(document.startTime),
                    endTime: Utils.format_date_string(document.endTime),
                    leader: idMap.get(document.leaderId),
                    comp: document.compositionName,
                    publishedDate: Utils.format_date_string(document.publishedDate),
                    id: document._id.toHexString()
                };
            });
            payload = JSON.stringify(formattedDocuments);
        }
        
        const filterString: string = Utils.generate_filter_string(this.validRequestQueryParameters, this.req);
        Logger.log_request(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} raids in payload with ${filterString.length > 0 ? "filter - " + filterString : "no filter"}`);
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
            const strippedName: string = this.req.query["name"].toString().replace(regex, "").toLowerCase();
            const escapedName: string = escapeStringRegexp(strippedName);
            
            filters.push({ $where: `this.name.replace(/${regex.source}/gi, '').toLowerCase().includes('${escapedName}')` });
        }
        if (this.req.query["comp"]) {
            const escapedComp: string = escapeStringRegexp(this.req.query["comp"].toString());
            const regex: RegExp = new RegExp(escapedComp, "gi");
            filters.push({ compositionName: regex });
        }
        if (this.req.query["leader"]) {
            const idMap = await Utils.matches_name_id_map(this.req.query["leader"].toString());
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
        const document = await DB.query_raid(this.req.params["id"]);
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
            idMap = await Utils.get_member_id_map(idArray, { returnGW2Names: true });
        }
        else {
            idMap = await Utils.get_member_id_map(idArray);
        }
        const leaderDiscordName = (await Utils.get_member_id_map([document.leaderId])).get(document.leaderId);

        const formattedDocument = {
            name: document.name,
            description: document.description,
            status: document.status,
            startTime: Utils.format_date_string(document.startTime),
            endTime: Utils.format_date_string(document.endTime),
            leader: leaderDiscordName,
            comp: document.compositionName,
            publishedDate: Utils.format_date_string(document.publishedDate),
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
            }),
            id: document._id.toHexString()
        };

        Logger.log_request(Severity.Debug, this.timestamp, `Sending one raid in payload with ID ${this.req.params["id"]}`);
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
            if (nameString != "discord" && nameString != "gw2") {
                throw new BadSyntaxException("Query parameter names must be either discord or gw2.");
            }
        }
    }

    /**
     * Returns the JSON string payload of a raid log after making a GET /raids/:id.log request.
     */
    public async send_response() {
        const document = await DB.query_raid(this.req.params["id"]);
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
            idMap = await Utils.get_member_id_map(idArray, { returnGW2Names: true });
        }
        else {
            idMap = await Utils.get_member_id_map(idArray);
        }

        const formattedDocument = document.log.map(log => {
            return {
                date: Utils.format_date_string(log.date),
                type: log.type,
                data: {
                    user: idMap.get(log.data.user ? log.data.user : log.data),
                    roleName: log.data.roleName,
                    isReserve: log.data.isReserve
                }
            }
        });

        Logger.log_request(Severity.Debug, this.timestamp, `Sending one raid in payload with ID ${this.req.params["id"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}