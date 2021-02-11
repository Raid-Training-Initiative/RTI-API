/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import Utils from "../util/Utils";

export class ListMembers extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "gw2Name",
        "discordName",
        "approver",
        "page",
        "pageSize"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: true});
    }

    /**
     * Returns the JSON string payload of a list of members after making a GET /members request.
     */
    public async send_response(pagination?: {page: number, pageSize: number}): Promise<void> {
        const documents = await DB.query_members(await this.db_filter(), pagination);

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.approverId));
        const idMap: Map<string, string> = await Utils.get_member_id_map(idArray);

        const formattedDocuments = documents.map(document => {
            return {
                gw2Name: document.gw2Name,
                discordName: document.gw2Name,
                approver: idMap.get(document.approverId),
                userId: document.userId,
                banned: document.banned
            };
        });

        const filterString: string = Utils.generate_filter_string(this.validRequestQueryParameters, this.req);
        Logger.log_request(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} members in payload with ${filterString.length > 0 ? "filter - " + filterString : "no filter"}`);
        const payload = JSON.stringify(formattedDocuments);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @throws {ResourceNotFoundException} When the approver is not found
     * @returns A filter to pass into the database query.
     */
    private async db_filter(): Promise<Object> {
        const filters: Object[] = [];
        if (this.req.query["gw2Name"]) {
            const idMap = await Utils.matches_name_id_map(this.req.query["gw2Name"].toString(), { returnGW2Names: true });
            filters.push({ userId: { $in: Array.from(idMap.keys()) }});
        }
        if (this.req.query["discordName"]) {
            const idMap = await Utils.matches_name_id_map(this.req.query["discordName"].toString(), { returnGW2Names: false });
            filters.push({ userId: { $in: Array.from(idMap.keys()) }});
        }
        if (this.req.query["approver"]) {
            const document = await DB.query_member_by_discord_name(this.req.query["approver"].toString());
            if (document == undefined) {
                throw new ResourceNotFoundException(this.req.query["approver"].toString());
            }
            filters.push({ approverId: document.userId });
        }

        return filters.length > 0 ? { $or: filters } : {};
    }
}

export class GetMember extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /comps/:comp request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     */
    public async send_response() {
        const document = await DB.query_member_by_id(this.req.params["discordid"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["discordid"]);
        }
        const approverDiscordName = (await Utils.get_member_id_map([document.approverId])).get(document.approverId);

        let formattedDocument = {};
        formattedDocument = {
            gw2Name: document.gw2Name,
            discordName: document.gw2Name,
            approver: approverDiscordName,
            userId: document.userId,
            banned: document.banned
        };
        
        Logger.log_request(Severity.Debug, this.timestamp, `Sending one member in payload with discordId ${this.req.params["discordId"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}