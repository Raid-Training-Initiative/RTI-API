/**
 * File for classes that handle requests for composition categories.
 */

import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./base/HTTPRequest";
import DB from "../util/DB";

export class ListCategories extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: false});
    }

    /**
     * Returns the JSON string payload of a list of categories after making a GET /categories request.
     */
    public async send_response(): Promise<void> {
        const documents = await DB.query_categories();
        const formattedDocuments = documents.map(document => { return { name: document.name } });

        Logger.log_request(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} categories in payload`);
        const payload = JSON.stringify(formattedDocuments);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}

export class GetCategory extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next);
    }

    /**
     * Returns the JSON string payload of a category after making a GET /categories/:category request.
     * @throws {ResourceNotFoundException} When the category cannot be found.
     */
    public async send_response() {
        const document = await DB.query_category(this.req.params["category"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["category"]);
        }

        const formattedDocument = {
            name: document.name
        };
        
        Logger.log_request(Severity.Debug, this.timestamp, `Sending one category in payload with name ${this.req.params["category"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}