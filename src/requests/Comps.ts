/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import DB from "../util/DB";
import Utils from "../util/Utils";
import * as fs from "fs";
import ResourceAlreadyExistsException from "../exceptions/ResourceAlreadyExistsException";
import { ObjectId } from "mongoose";
import HTTPPostRequest from "./base/HTTPPostRequest";
import HTTPGetRequest from "./base/HTTPGetRequest";

export class ListComps extends HTTPGetRequest {
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
     * @throws {ResourceNotFoundException} When a category is not found in the database.
     * @returns A filter to pass into the database query.
     */
    private async db_filter(): Promise<Object> {
        const filters: Object[] = [];
        if (this.req.query["categories"]) {
            const filterCategories: string[] = this.req.query["categories"]?.toString().toLowerCase().split(",");
            const filterCategoryIds: Map<string, ObjectId> = await Utils.get_category_ids_map_from_categories(filterCategories);
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

export class GetComp extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true});
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

export class CreateComp extends HTTPPostRequest {
    public validRequestQueryParameters: string[] = [];
    public requestBodyJsonSchema: object = JSON.parse(fs.readFileSync("resources/schemas/comp.schema.json", "utf8"));;

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true});
    }

    /**
     * Returns a comp after making a GET /comps/:comp request.
     * @throws {ResourceAlreadyExistsException} When there's already a comp with the specified name.
     * @throws {ResourceNotFoundException} When one of the specified categories cannot be found in the database.
     * @returns An object representing a comp.
     */
    public async prepare_response(): Promise<Object> {
        const compJson = this.req.body;
        if (await DB.query_comp(compJson.name) != undefined) {
            throw new ResourceAlreadyExistsException(compJson.name);
        }

        const categoryDocuments = await Utils.get_category_ids_map_from_categories(compJson.categories);
        compJson.categories.forEach((category: string) => {
            if (!categoryDocuments.has(category.toLowerCase())) {
                throw new ResourceNotFoundException(category);
            }
        })
        
        const categoryIds: ObjectId[] = Array.from(categoryDocuments.values());
        return await DB.create_comp(compJson.name, compJson.roles, categoryIds);
    }
}