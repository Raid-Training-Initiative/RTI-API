/**
 * File for classes that handle requests for training requests.
 */

import { NextFunction, Request, Response } from "express";
import DB from "../util/DB";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import HTTPRequest from "./base/HTTPRequest";
import Utils from "../util/Utils";
import { TrainingRequestDisabledReason } from "@RTIBot-DB/documents/ITrainingRequestDocument";
import escapeStringRegexp = require("escape-string-regexp");

export class ListTrainingRequests extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "keywords",
        "active",
        "wings",
        "disabledReasons",
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
    public async validate_request() {
        await super.validate_request();
        
        if (this.req.query["disabledReasons"]) {
            const disabledReasonStrings: string[] = this.req.query["disabledReasons"].toString().toLowerCase().split(",");
            disabledReasonStrings.forEach(disabledReasonString => {
                const supportedValues: string[] = Object.values(TrainingRequestDisabledReason);
                const supportedValuesLowercase: string[] = supportedValues.map(value => value.toLowerCase());
                if (!supportedValuesLowercase.includes(disabledReasonString)) {
                    throw new BadSyntaxException(`Query parameter disabledReasons must be one of the following values: ${supportedValues.join(", ")}`);
                }
            })
        }
        if (this.req.query["wings"]) {
            const wingStrings: string[] = this.req.query["wings"].toString().toLowerCase().split(",");
            wingStrings.forEach(wingString => {
                if (!Number.parseInt(wingString)) {
                    throw new BadSyntaxException("Query parameter wings must include only numbers.");
                }
            });   
        }
    }

    /**
     * Returns a list of training requests after making a GET /trainingrequests request.
     * @returns A list of objects representing training requests.
     */
    public async prepare_response(paginated?: {page: number, pageSize: number}): Promise<Object[]> {
        const documents = await DB.query_training_requests(await this.db_filter(), paginated);

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach(document => idArray.push(document.userId));
        const idMap: Map<string, string | undefined> = await Utils.ids_to_map(idArray);

        let formattedDocuments: Object[];
        if ((this.req.query["format"]) && (this.req.query["format"].toString().toLowerCase() == "csv")) {
            formattedDocuments = documents
                .filter(document => idMap.get(document.userId)) // Filtering out the users that aren't on the Discord anymore.
                .map(document => {
                    const wingsData: string[] = [];
                    for (let i = 1; i <= 7; i++) {
                        if (document.history.get(i.toString())) {
                            if (document.history.get(i.toString())?.requestedDate && document.history.get(i.toString())?.clearedDate) {
                                wingsData.push(`Cleared on ${document.history.get(i.toString())?.clearedDate?.toISOString().split("T")[0]}`);
                            } else if (document.history.get(i.toString())?.requestedDate) {
                                wingsData.push(`Requested on ${document.history.get(i.toString())?.requestedDate?.toISOString().split("T")[0]}`);
                            } else if (document.history.get(i.toString())?.clearedDate) {
                                wingsData.push(`Already cleared`)
                            } else {
                                wingsData.push("");
                            }
                        } else {
                            wingsData.push(`Not requested`);
                        }
                    }
                    return `${idMap.get(document.userId)},${document.userId},${document.active},${wingsData.join(",")}`;
                });
        } else {
            formattedDocuments = documents.map(document => {
                return {
                    discordTag: idMap.get(document.userId),
                    active: document.active,
                    requestedWings: document.requestedWings,
                    comment: document.comment,
                    created: Utils.format_datetime_string(document.creationDate),
                    lastEdited: Utils.format_datetime_string(document.lastEditedTimestamp),
                    disabledReason: document.disabledReason,
                    userId: document.userId
                };
            });
        }
        
        return formattedDocuments;
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @returns A filter to pass into the database query.
     */
    private async db_filter(): Promise<Object> {
        const filters: Object[] = [];

        if (this.req.query["keywords"]) {
            const filterKeywords: string[] = this.req.query["keywords"].toString().split(",");
            const keywordQuery: string = `"${filterKeywords.join("\",\"")}"`;
            filters.push({ $text: { $search: keywordQuery }});
        }
        if (this.req.query["active"]) {
            filters.push({ active: this.req.query["active"].toString().toLowerCase() == "true" });
        }
        if (this.req.query["wings"]) {
            const filterWings: number[] = this.req.query["wings"].toString()
                .split(",").map(wing => Number.parseInt(wing));
            filters.push({ requestedWings: { $in: filterWings }});
        }
        if (this.req.query["disabledReasons"]) {
            const filterDisabledReasons: RegExp[] = this.req.query["disabledReasons"].toString()
                .split(",").map(disabledReason => new RegExp(`^${escapeStringRegexp(disabledReason)}$`, "gi"));
            filters.push({ disabledReason: { $in: filterDisabledReasons }});
        }
        
        return filters.length > 0 ? { "$and": filters } : {};
    }
}