/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import Utils from "../util/Utils";
import BadSyntaxException from "../exceptions/BadSyntaxException";

export class ListMembers extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "gw2Name",
        "discordTag",
        "approver",
        "banned",
        "format",
        "page",
        "pageSize"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: true, multiFormat: true});
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public validateTequest() {
        super.validateTequest();

        if (this._req.query["banned"]) {
            const publishedString: string = this._req.query["banned"].toString().toLowerCase();
            if (publishedString != "true" && publishedString != "false") {
                throw new BadSyntaxException("Query parameter banned must be either true or false.");
            }
        }
    }

    /**
     * Returns a list of members after making a GET /members request.
     * @returns A list of objects representing members.
     */
    public async prepareResponse(pagination?: {page: number, pageSize: number}): Promise<Object[]> {
        const documents = await DB.queryMembers(await this.dbFilter(), pagination);

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.approverId));
        const idMap: Map<string, string | undefined> = await Utils.idsToMap(idArray);

        let formattedDocuments: Object[];
        if ((this._req.query["format"]) && (this._req.query["format"].toString().toLowerCase() == "csv")) {
            formattedDocuments = documents.map(document => {
                return `${idMap.get(document.approverId)},${document.gw2Name},${document.discordTag}`;
            })
        } else {
            formattedDocuments = documents.map(document => {
                return {
                    gw2Name: document.gw2Name,
                    discordName: document.discordName,
                    discordTag: document.discordTag,
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
    private async dbFilter(): Promise<Object> {
        const filters: Object[] = [];
        if (this._req.query["gw2Name"]) {
            const idMap = await Utils.matchesNameIdMap(this._req.query["gw2Name"].toString(), { returnGW2Names: true });
            filters.push({ userId: { $in: Array.from(idMap.keys()) }});
        }
        if (this._req.query["discordTag"]) {
            const idMap = await Utils.matchesNameIdMap(this._req.query["discordTag"].toString(), { returnGW2Names: false });
            filters.push({ userId: { $in: Array.from(idMap.keys()) }});
        }
        if (this._req.query["approver"]) {
            const document = await DB.queryMemberByName(this._req.query["approver"].toString());
            if (document == undefined) {
                throw new ResourceNotFoundException(this._req.query["approver"].toString());
            }
            filters.push({ approverId: document.userId });
        }
        if (this._req.query["banned"]) {
            const booleanBanned: boolean = this._req.query["banned"].toString().toLowerCase() == "true";
            filters.push({ banned: booleanBanned});
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
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryMemberById(this._req.params["discordid"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["discordid"]);
        }
        const approverDiscordName = (await Utils.idsToMap([document.approverId])).get(document.approverId);

        const formattedDocument = {
            gw2Name: document.gw2Name,
            discordName: document.discordName,
            discordTag: document.discordTag,
            approver: approverDiscordName,
            userId: document.userId,
            banned: document.banned
        };
        
        return formattedDocument;
    }
}