/**
 * File for classes that handle requests for compositions.
 */

import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../util/Logger";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPRequest from "./HTTPRequest";

export class ListComps extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "categories"
    ];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * Returns the JSON string payload of a list of comps after making a GET /comps request.
     */
    public async send_response(): Promise<void> {
        const documents = (await this.db.raidCompositionModel.find().populate("categories").exec()) as IRaidCompositionPopulatedDocument[];
        const filteredDocuments = await this.filter_documents(documents);
        const formattedDocuments = filteredDocuments.map(document => {
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
        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending ${formattedDocuments.length} comps in payload with filter: ${this.req.query["categories"] ? this.req.query["categories"] : "none"}`);
        const payload = JSON.stringify(formattedDocuments);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @param documents The unfiltered list of database documents returned from the database.
     * @returns A list of documents filtered by the request's query parameters.
     */
    private async filter_documents(documents: IRaidCompositionPopulatedDocument[]): Promise<IRaidCompositionPopulatedDocument[]> {
        return documents.filter(document => {
            if (this.req.query["categories"]) { // If there are categories to filter with.
                const filterCategories = (this.req.query["categories"] as string).split(",");
                return document.categories.filter(category => filterCategories.includes(category.name)).length > 0;
            }
            else return true;
        });
    }
}

export class GetComp extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /comps/:comp request.
     */
    public async send_response() {
        const document = (await this.db.raidCompositionModel.findOne({name: this.req.params["comp"]}).populate("categories").exec()) as IRaidCompositionPopulatedDocument;
        if (document == undefined) {
            throw new ResourceNotFoundException(this.req.params["comp"]);
        }

        let formattedDocument = {};
        formattedDocument = {
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
        
        Logger.LogRequest(Severity.Debug, this.timestamp, `Sending one comp in payload with name ${this.req.params["comp"]}`);
        const payload = JSON.stringify(formattedDocument);
        this.res.set("Content-Type", "application/json");
        this.res.send(payload);
    }
}