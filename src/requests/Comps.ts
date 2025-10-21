/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import DB from "../util/DB";
import Utils from "../util/Utils";
import * as fs from "fs";
import ResourceAlreadyExistsException from "../exceptions/ResourceAlreadyExistsException";
import { FilterQuery, ObjectId } from "mongoose";
import HTTPPostRequest from "./base/HTTPPostRequest";
import HTTPGetRequest from "./base/HTTPGetRequest";
import HTTPDeleteRequest from "./base/HTTPDeleteRequest";
import { CompositionDto } from "src/requests/dto/comp.dto";
import { IRaidCompositionModel } from "@RTIBot-DB/schemas/RaidCompositionSchema";
import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";

export class ListComps extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = ["categories"];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns the list of comps after making a GET /comps request.
     * @returns A list of objects representing comps.
     */
    public async prepareResponse(): Promise<CompositionDto[]> {
        const documents = await DB.queryComps(await this.dbFilter());
        return documents.map((document) =>
            CompositionDto.fromDocument(document),
        );
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @throws {ResourceNotFoundException} When a category is not found in the database.
     * @returns A filter to pass into the database query.
     */
    private async dbFilter(): Promise<FilterQuery<IRaidCompositionModel>> {
        const filters: Record<string, unknown>[] = [];

        if (this._req.query["categories"]) {
            const filterCategories: string[] = this._req.query["categories"]
                ?.toString()
                .toLowerCase()
                .split(",");
            const filterCategoryIds: Map<string, ObjectId> =
                await Utils.getCategoryIdsMapFromCategories(filterCategories);
            filterCategories.forEach((filterCategory) => {
                if (filterCategoryIds.has(filterCategory)) {
                    filters.push({
                        categories: filterCategoryIds.get(filterCategory),
                    });
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
        super(req, res, next);
    }

    /**
     * Returns a comp after making a GET /comps/:comp request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     * @returns An object representing a comp.
     */
    public async prepareResponse(): Promise<CompositionDto> {
        const document = await DB.queryComp(this._req.params["comp"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["comp"]);
        }

        return CompositionDto.fromDocument(document);
    }
}

export class CreateComp extends HTTPPostRequest {
    public validRequestQueryParameters: string[] = [];
    public requestBodyJsonSchema: object = JSON.parse(
        fs.readFileSync("resources/schemas/comp.schema.json", "utf8"),
    );

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns a comp after making a GET /comps/:comp request.
     * @throws {ResourceAlreadyExistsException} When there's already a comp with the specified name.
     * @throws {ResourceNotFoundException} When one of the specified categories cannot be found in the database.
     * @returns An object representing a comp.
     */
    public async prepareResponse(): Promise<CompositionDto> {
        const compJson = this._req.body;
        if ((await DB.queryComp(compJson.name)) != undefined) {
            throw new ResourceAlreadyExistsException(compJson.name);
        }

        const categoryDocuments = await Utils.getCategoryIdsMapFromCategories(
            compJson.categories,
        );
        compJson.categories.forEach((category: string) => {
            if (!categoryDocuments.has(category.toLowerCase())) {
                throw new ResourceNotFoundException(category);
            }
        });

        const categoryIds: ObjectId[] = Array.from(categoryDocuments.values());
        const document = await DB.createComp(
            compJson.name,
            compJson.roles,
            categoryIds,
        );

        return CompositionDto.fromDocument(
            document as unknown as IRaidCompositionPopulatedDocument,
        );
    }
}

export class DeleteComp extends HTTPDeleteRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Attempts a comp deletion after a DELETE /comps/:comp request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     */
    public async prepareResponse(): Promise<void> {
        const deleted = await DB.deleteComp(this._req.params["comp"]);
        if (!deleted) {
            throw new ResourceNotFoundException(this._req.params["comp"]);
        }
    }
}
