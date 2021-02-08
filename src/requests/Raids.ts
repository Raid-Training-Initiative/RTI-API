/**
 * File for classes that handle requests for raids.
 */

import { IRaidEventDocument } from "@RTIBot-DB/documents/IRaidEventDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import HTTPRequest from "./HTTPRequest";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import Utils from "../util/Utils";

export class ListRaids extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "status",
        "name",
        "comp",
        "leader",
        "format"
    ];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public async validate_request() {
        await super.validate_request();

        if (this.req.query["status"]) {
            const statusString: string = this.req.query["status"]?.toString().toUpperCase();
            if (statusString != "DRAFT" && statusString != "PUBLISHED" && statusString != "ARCHIVED") {
                throw new BadSyntaxException("Query parameter status must be either draft, published, or archived.");
            }
        }

        if (this.req.query["format"]) {
            const formatString: string = this.req.query["format"]?.toString().toUpperCase();
            if (formatString != "CSV" && formatString != "JSON") {
                throw new BadSyntaxException("Query parameter format must be either csv or json.");
            }
        }
    }

    /**
     * Returns the JSON (or CSV) string payload of a list of raids after making a GET /raids request.
     * @throws {ResourceNotFoundException} When a comp specified in the comp query parameter does not exist.
     */
    public async send_response(): Promise<void> {
        const documents = (await this.db.raidEventModel.find().exec()) as IRaidEventDocument[];
        const filteredDocuments = await this.filter_documents(documents);

        // Resolve the IDs to names.
        const leaderIds = new Array<string>();
        filteredDocuments.forEach(document => leaderIds.push(document.leaderId));
        const leaderMap: Map<string, string> = await Utils.getIdMap(leaderIds, this.db);
        
        let payload: string = "";
        let formattedDocuments: Object[];
        if ((this.req.query["format"]) && (this.req.query["format"].toString().toUpperCase() == "CSV")) {
            formattedDocuments = filteredDocuments.map(document => {
                return leaderMap.get(document.leaderId) + "," + document.name + ","
                    + document.startTime.toISOString().split("T")[0] + ","
                    + document.startTime.toISOString().split("T")[1].replace(/:\d+\.\d+Z/, "");
            });
            payload = formattedDocuments.join("\n");
        }
        else {
            formattedDocuments = filteredDocuments.map(document => {
                return {
                    id: document._id,
                    name: document.name,
                    status: document.status,
                    startTime: document.startTime.toJSON().toString().replace(/\.\d+Z/, ""),
                    endTime: document.endTime.toJSON().toString().replace(/\.\d+Z/, ""),
                    leader: leaderMap.get(document.leaderId),
                    comp: document.compositionName
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
     * @param documents The unfiltered list of database documents returned from the database.
     * @throws {ResourceNotFoundException} When a comp specified in the comp query parameter does not exist.
     * @returns A list of documents filtered by the request's query parameters.
     */
    private async filter_documents(documents: IRaidEventDocument[]): Promise<IRaidEventDocument[]> {
        let comps: string[] = [];
        const leaderIds = new Array<string>();
        let leaderMap = new Map<string, string>();
        if (this.req.query["comp"]) {
            const compDocuments = (await this.db.raidCompositionModel.find()) as IRaidCompositionCategoryDocument[];

            if (this.req.query["comp"]) {
                comps = compDocuments.map(comp => { return comp.name.toUpperCase(); });
            }
        }

        if (this.req.query["leader"]) {
            const raidDocuments = (await this.db.raidEventModel.find()) as IRaidEventDocument[];
            raidDocuments.forEach(document => leaderIds.push(document.leaderId));
        }
        leaderMap = await Utils.getIdMap(leaderIds, this.db);
        
        const filteredDocuments = documents.filter(document => {
            let filter: boolean = true;

            if (this.req.query["status"] && filter) { // If there is a status filter in the query parameters and filter is still true.
                filter = document.status.toUpperCase() == this.req.query["status"].toString().toUpperCase();
            }
            if (this.req.query["name"] && filter) { // If there is a name filter in the query parameters and filter is still true.
                const regex: RegExp = /[-!$%^&*()_+|~=`{}[\]:";'<>?,./\s]+/;
                filter = document.name.replace(regex, "").toUpperCase()
                    .includes(this.req.query["name"].toString().replace(regex, "").toUpperCase());
            }
            if (this.req.query["comp"] && filter) { // If there is a comp filter in the query parameters and filter is still true.
                if (comps.indexOf(this.req.query["comp"].toString().toUpperCase()) == -1) {
                    throw new ResourceNotFoundException(this.req.query["comp"].toString());
                }
                filter = document.compositionName.toUpperCase() == this.req.query["comp"].toString().toUpperCase();
            }
            if (this.req.query["leader"] && filter) { // If there is a leader filter in the query parameters and filter is still true.
                const regex: RegExp = /[#.\d]+/;
                const leader = leaderMap.get(document.leaderId);
                if (leader != undefined) {
                    filter = leader.replace(regex, "").toUpperCase() ==
                    this.req.query["leader"].toString().replace(regex, "").toUpperCase();
                } else {
                    filter = false;
                }
            }

            return filter;
        });

        return filteredDocuments;
    }
}

export class GetRaid extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * Returns the JSON string payload of a raid after making a GET /raids/:id request.
     */
    public async send_response() {
        
    }
}