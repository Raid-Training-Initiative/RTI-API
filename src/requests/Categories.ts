/**
 * File for classes that handle requests for composition categories.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";
import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";

export class ListCategories extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_COMPS]
            }
        });
    }

    /**
     * Returns the list of categories after making a GET /categories request.
     * @returns A list of objects representing categories.
     */
    public async prepareResponse(): Promise<Object[]> {
        const documents = await DB.queryCategories();
        const formattedDocuments = documents.map(document => { return { name: document.name } });

        return formattedDocuments;
    }
}

export class GetCategory extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            authenticated: {
                permissions: [MemberPermission.VIEW_COMPS]
            }
        });
    }

    /**
     * Returns a category after making a GET /categories/:category request.
     * @throws {ResourceNotFoundException} When the category cannot be found.
     * @returns An object representing a category.
     */
    public async prepareResponse(): Promise<Object> {
        const document = await DB.queryCategory(this._req.params["category"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["category"]);
        }
        const formattedDocument = {
            name: document.name
        };
        
        return formattedDocument;
    }
}