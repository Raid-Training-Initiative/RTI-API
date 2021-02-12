/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import Utils from "../util/Utils";

export class ListComps extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "categories"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true});
    }

    /**
     * Returns the list of comps after making a GET /comps request.
     * @returns A list of objects representing comps.
     */
    public async prepare_response(): Promise<Object[]> {
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
        
        return formattedDocuments;
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
     * Returns a comp after making a GET /comps/:comp request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     * @returns An object representing a comp.
     */
    public async prepare_response(): Promise<Object> {
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
        
        return formattedDocument;
    }
}