/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import Utils from "../util/Utils";
import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";

export class ListComps extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "categories"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_COMPS]
            }
        });
    }

    /**
     * Returns the list of comps after making a GET /comps request.
     * @returns A list of objects representing comps.
     */
    public async prepareResponse(): Promise<Object[]> {
        const documents = await DB.queryComps(await this.dbFilter());
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
     * @throws {ResourceNotFoundException} When a category is not found in the database.
     * @returns A filter to pass into the database query.
     */
    private async dbFilter(): Promise<Object> {
        const filters: Object[] = [];
        if (this._req.query["categories"]) {
            const filterCategories: string[] = this._req.query["categories"]?.toString().toLowerCase().split(",");
            const filterCategoryIds: Map<string, string> = await Utils.getCategoryIdsMapFromCategories(filterCategories);
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
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_COMPS]
            }
        });
    }

    /**
     * Returns a comp after making a GET /comps/:comp request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     * @returns An object representing a comp.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryComp(this._req.params["comp"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["comp"]);
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