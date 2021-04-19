/**
 * File for classes that handle requests for raids.
 */

import { NextFunction, Request, Response } from "express";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import Utils from "../util/Utils";
import escapeStringRegexp = require("escape-string-regexp");
import DB from "../util/DB";
import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";
import HTTPGetRequest from "./base/HTTPGetRequest";

export class ListRaids extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [
        "status",
        "name",
        "comps",
        "leader",
        "published",
        "participants",
        "reserves",
        "format",
        "page",
        "pageSize"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_RAIDS]
            }, 
            paginated: true, 
            multiFormat: true
        });
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["status"]) {
            const statusStrings: string[] = this._req.query["status"].toString().toLowerCase().split(",");
            statusStrings.forEach(statusString => {
                if (statusString != "draft" && statusString != "published" && statusString != "archived") {
                    throw new BadSyntaxException("Query parameter status must be either draft, published, or archived.");
                }
            });
        }
        if (this._req.query["published"]) {
            const publishedString: string = this._req.query["published"].toString().toLowerCase();
            if (publishedString != "true" && publishedString != "false") {
                throw new BadSyntaxException("Query parameter published must be either true or false.");
            }
        }
    }

    /**
     * Returns a list of raids after making a GET /raids request.
     * @returns A list of objects representing raids.
     */
    public async prepareResponse(paginated?: {page: number, pageSize: number}): Promise<Object[]> {
        const documents = await DB.queryRaids(await this.dbFilter(), paginated);

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.leaderId));
        const idMap: Map<string, string | undefined> = await Utils.idsToMap(idArray);
        
        let formattedDocuments: Object[];
        if ((this._req.query["format"]) && (this._req.query["format"].toString().toLowerCase() == "csv")) {
            formattedDocuments = documents.map(document => {
                return `"${idMap.get(document.leaderId)}","${document.name}","${document.startTime.toISOString().split("T")[0]}","${document.startTime.toISOString().split("T")[1].replace(/:\d+\.\d+Z/, "")}"`;
            });
        } else {
            formattedDocuments = documents.map(document => {
                return {
                    name: document.name,
                    status: document.status,
                    startTime: Utils.formatDatetimeString(document.startTime),
                    endTime: Utils.formatDatetimeString(document.endTime),
                    leader: idMap.get(document.leaderId),
                    comp: document.compositionName,
                    publishedDate: Utils.formatDatetimeString(document.publishedDate),
                    id: document._id.toHexString()
                };
            });
        }
        
        return formattedDocuments;
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @throws {ResourceNotFoundException} When the Discord name of the specified leader cannot be found in the database.
     * @returns A filter to pass into the database query.
     */
    private async dbFilter(): Promise<Object> {
        const filters: Object[] = [];
        if (this._req.query["status"]) {
            const filterStatus: RegExp[] = Utils.getRegexListFromQueryString(this._req.query["status"].toString());
            filters.push({ status: { $in: filterStatus }});
        }
        if (this._req.query["name"]) {
            const regex: RegExp = /[-!$%^&*()_+|~=`{}[\]:";'<>?,./\s]+/gi;
            const strippedName: string = this._req.query["name"].toString().replace(regex, "").toLowerCase();
            const escapedName: string = escapeStringRegexp(strippedName);
            
            filters.push({ $where: `this.name.replace(/${regex.source}/gi, '').toLowerCase().includes('${escapedName}')` });
        }
        if (this._req.query["comps"]) {
            const filterComps: RegExp[] = Utils.getRegexListFromQueryString(this._req.query["comps"].toString());
            filters.push({ compositionName: { $in: filterComps } });
        }
        if (this._req.query["leader"]) {
            const document = await DB.queryMemberByName(this._req.query["leader"].toString());
            if (document == undefined) {
                throw new ResourceNotFoundException(this._req.query["leader"].toString());
            }
            filters.push({ leaderId: document.userId });
        }
        if (this._req.query["published"]) {
            const publishedString = this._req.query["published"].toString().toLowerCase();
            filters.push({ publishedDate: { "$exists" : publishedString == "true" }});
        }
        if (this._req.query["participants"]) {
            const filterParticipants: string[] = this._req.query["participants"].toString().split(",");
            const memberMap: Map<string | undefined, string> = await Utils.namesToMap(filterParticipants);
            filters.push({ "roles.participants": { $all: Array.from(memberMap.values()) } });
        }
        if (this._req.query["reserves"]) {
            const filterParticipants: string[] = this._req.query["reserves"].toString().split(",");
            const memberMap: Map<string | undefined, string> = await Utils.namesToMap(filterParticipants);
            filters.push({ "roles.reserves": { $all: Array.from(memberMap.values()) } });
        }
        
        return filters.length > 0 ? { "$and": filters } : {};
    }
}

export class GetRaid extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [
        "names"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_RAIDS]
            }
        });
    }

    /**
     * Perform specific validation for this endpoint.
     * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["names"]) {
            const nameString: string = this._req.query["names"]?.toString().toLowerCase();
            if (nameString != "discord" && nameString != "gw2") {
                throw new BadSyntaxException("Query parameter names must be either discord or gw2.");
            }
        }
    }

    /**
     * Returns a raid after making a GET /raids/:id request.
     * @throws {ResourceNotFoundException} When the raid cannot be found.
     * @returns An object representing a raid.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryRaid(this._req.params["id"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["id"])
        }

        // Resolve the IDs to names.
        const idArray: string[] = [];
        document.roles.forEach(role => {
            role.participants.forEach(participant => idArray.push(participant));
            role.reserves.forEach(reserve => idArray.push(reserve));
        });
        let idMap: Map<string, string | undefined>;
        if (this._req.query["names"] && this._req.query["names"].toString().toLowerCase() == "gw2") {
            idMap = await Utils.idsToMap(idArray, { returnGW2Names: true });
        }
        else {
            idMap = await Utils.idsToMap(idArray);
        }
        const leaderDiscordName = (await Utils.idsToMap([document.leaderId])).get(document.leaderId);

        const formattedDocument = {
            name: document.name,
            description: document.description,
            status: document.status,
            startTime: Utils.formatDatetimeString(document.startTime),
            endTime: Utils.formatDatetimeString(document.endTime),
            leader: leaderDiscordName,
            comp: document.compositionName,
            publishedDate: Utils.formatDatetimeString(document.publishedDate),
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

        return formattedDocument;
    }
}

export class GetRaidLog extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [
        "names"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_RAIDS]
            }
        });
    }

    /**
     * Perform specific validation for this endpoint.
     * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["names"]) {
            const nameString: string = this._req.query["names"]?.toString().toLowerCase();
            if (nameString != "discord" && nameString != "gw2") {
                throw new BadSyntaxException("Query parameter names must be either discord or gw2.");
            }
        }
    }

    /**
     * Returns a raid log after making a GET /raids/:id.log request.
     * @throws {ResourceNotFoundException} When the raid cannot be found.
     * @returns An object representing a raid log.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryRaid(this._req.params["id"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["id"])
        }

        // Resolve the IDs to names.
        const idArray: string[] = [];
        document.log.forEach(log => {
            idArray.push(log.data.user ? log.data.user : log.data);
        });
        let idMap: Map<string, string | undefined>;
        if (this._req.query["names"] && this._req.query["names"].toString().toLowerCase() == "GW2") {
            idMap = await Utils.idsToMap(idArray, { returnGW2Names: true });
        } else {
            idMap = await Utils.idsToMap(idArray);
        }

        const formattedDocument = document.log.map(log => {
            return {
                date: Utils.formatDatetimeString(log.date),
                type: log.type,
                data: {
                    user: idMap.get(log.data.user ? log.data.user : log.data),
                    roleName: log.data.roleName,
                    isReserve: log.data.isReserve
                }
            }
        });

        return formattedDocument;
    }
}
