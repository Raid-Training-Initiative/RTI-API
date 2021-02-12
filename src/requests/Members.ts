/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import Utils from "../util/Utils";

export class ListMembers extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "gw2Name",
        "discordName",
        "approver",
        "format",
        "page",
        "pageSize"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: true, multiFormat: true});
    }

    /**
     * Returns the JSON string payload of a list of members after making a GET /members request.
     */
    public async prepare_response(pagination?: {page: number, pageSize: number}): Promise<Object[]> {
        const documents = await DB.query_members(await this.db_filter(), pagination);

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.approverId));
        const idMap: Map<string, string> = await Utils.get_member_id_map(idArray);

        let formattedDocuments: Object[];
        if ((this.req.query["format"]) && (this.req.query["format"].toString().toLowerCase() == "csv")) {
            formattedDocuments = documents.map(document => {
                return `${idMap.get(document.approverId)},${document.gw2Name},${document.gw2Name}`;
            })
        } else {
            formattedDocuments = documents.map(document => {
                return {
                    gw2Name: document.gw2Name,
                    discordName: document.gw2Name,
                    approver: idMap.get(document.approverId),
                    userId: document.userId,
                    banned: document.banned
                };
            });
        }

        return formattedDocuments;
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
            const document = await DB.query_member_by_name(this.req.query["approver"].toString());
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
    public async prepare_response(): Promise<Object> {
        const document = await DB.query_member_by_id(this.req.params["discordid"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["discordid"]);
        }
        const approverDiscordName = (await Utils.get_member_id_map([document.approverId])).get(document.approverId);

        const formattedDocument = {
            gw2Name: document.gw2Name,
            discordName: document.gw2Name,
            approver: approverDiscordName,
            userId: document.userId,
            banned: document.banned
        };
        
        return formattedDocument;
    }
}