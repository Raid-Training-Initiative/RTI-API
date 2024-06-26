/**
 * File for classes that handle requests for composition categories.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import DB from "../util/DB";
import HTTPGetRequest from "./base/HTTPGetRequest";
import { CategoryDto } from "src/requests/dto/category.dto";

export class ListCategories extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns the list of categories after making a GET /categories request.
     * @returns A list of objects representing categories.
     */
    public async prepareResponse(): Promise<CategoryDto[]> {
        const documents = await DB.queryCategories();
        return documents.map((document) => CategoryDto.fromDocument(document));
    }
}

export class GetCategory extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns a category after making a GET /categories/:category request.
     * @throws {ResourceNotFoundException} When the category cannot be found.
     * @returns An object representing a category.
     */
    public async prepareResponse(): Promise<CategoryDto> {
        const document = await DB.queryCategory(this._req.params["category"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["category"]);
        }

        return CategoryDto.fromDocument(document);
    }
}
