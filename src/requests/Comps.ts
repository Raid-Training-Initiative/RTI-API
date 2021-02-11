/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import Utils from "../util/Utils";

export class ListComps extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "categories"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: false});
    }

    /**
     * Returns the JSON string payload of a list of comps after making a GET /comps request.
     */
    public async send_response(): Promise<void> {
        const documents = await DB.query_comps(await this.db_filter());
        const formattedDocuments = documents.map(document => {
            return {
                name: document.name,
                categories: document.categories.map(category => {
                    return category.name
                }),
                roles: document.roles.map(role => {
                    return {
                        name: role.name,
                        requiredParticipants: role.requiredParticipants
                    }
                })
            };
        });
        Logger.log_request(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} comps in payload with filter: ${this.req.query["categories"] ? this.req.query["categories"] : "none"}`);
        const payload = JSON.stringify(formattedDocuments);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @returns A filter to pass into the database query.
     */
    private async db_filter(): Promise<Object> {
        const filters: Object[] = [];
        if (this.req.query["categories"]) {
            const filterCategories: string[] = this.req.query["categories"]?.toString().toLowerCase().split(",");
            const filterCategoryIds: Map<string, string> = await Utils.get_category_ids_map_from_categories(filterCategories);
            filterCategories.forEach(filterCategory => {
                if (filterCategoryIds.has(filterCategory)) {
                    filters.push({"categories": filterCategoryIds.get(filterCategory)});
                } else {
                    throw new ResourceNotFoundException(filterCategory);
                }
            });
        }

        return filters.length > 0 ? { $or: filters } : {};
    }
}

export class GetComp extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /comps/:comp request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     */
    public async send_response() {
        const document = await DB.query_comp(this.req.params["comp"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["comp"]);
        }

        const formattedDocument = {
            name: document.name,
            categories: document.categories.map(category => {
                return category.name
            }),
            roles: document.roles.map(role => {
                return {
                    name: role.name,
                    requiredParticipants: role.requiredParticipants
                }
            })
        };
        
        Logger.log_request(Severity.Debug, this.timestamp, `Sending one comp in payload with name ${this.req.params["comp"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}