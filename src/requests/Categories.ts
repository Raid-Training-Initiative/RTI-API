/**
 * File for classes that handle requests for composition categories.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";

export class ListCategories extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true});
    }

    /**
     * Returns the list of categories after making a GET /categories request.
     * @returns A list of objects representing categories.
     */
    public async prepare_response(): Promise<Object[]> {
        const documents = await DB.query_categories();
        const formattedDocuments = documents.map(document => { return { name: document.name } });

        return formattedDocuments;
    }
}

export class GetCategory extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns a category after making a GET /categories/:category request.
     * @throws {ResourceNotFoundException} When the category cannot be found.
     * @returns An object representing a category.
     */
    public async prepare_response(): Promise<Object> {
        const document = await DB.query_category(this.req.params["category"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["category"]);
        }
        const formattedDocument = {
            name: document.name
        };
        
        return formattedDocument;
    }
}