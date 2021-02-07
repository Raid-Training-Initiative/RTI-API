/**
 * File for classes that handle requests for composition categories.
 */

import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./HTTPRequest";

export class ListCategories extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "categories"
    ];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * This method returns the JSON string payload of a list of categories after making a GET /categories request.
     */
    public async send_response(): Promise<void> {
        const documents = (await this.db.raidCompositionCategoryModel.find().exec()) as IRaidCompositionCategoryDocument[];
        const formattedDocuments = documents.map(document => { return { name: document.name } });
        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} categories in payload`);
        this.res.set("Content-Type", "application/json");
        this.res.send(JSON.stringify(formattedDocuments));
    }
}

export class GetCategory extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * This method returns the JSON string payload of a list of comps after making a GET /comps request.
     */
    public async send_response() {
        const documents = (await this.db.raidCompositionCategoryModel.find().exec()) as IRaidCompositionCategoryDocument[];
        const filteredDocuments = documents.filter(document => { return document.name == this.req.params["category"]; });
        let formattedDocument = {};
        if (filteredDocuments.length > 0) {
            formattedDocument = { name: filteredDocuments[0].name };
        }
        else {
            throw new ResourceNotFoundException(this.req.params["category"]);
        }

        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending one category in payload with name ${this.req.params["category"]}`);
        this.res.set("Content-Type", "application/json");
        this.res.send(JSON.stringify(formattedDocument));
    }
}