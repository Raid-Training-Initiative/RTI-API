import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import { Logger, Severity } from "../Logger";
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
     * This method returns the JSON string payload of a list of comps after making a GET /comps request.
     */
    public async send_response() {
        const documents = (await this.db.raidCompositionModel.find().populate("categories")) as IRaidCompositionPopulatedDocument[];
        const formattedDocuments = documents.filter(document =>{
                if (this.req.query["categories"]) { // If there are categories to filter with.
                    const filterCategories = (this.req.query["categories"] as string).split(",");
                    return document.categories.filter(category => filterCategories.includes(category.name)).length > 0;
                }
                else return true;
            }).map(document => {
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
        Logger.Log(Severity.Debug, `Sending ${formattedDocuments.length} comps in payload with filter: ${this.req.query["categories"] ? this.req.query["categories"] : "none"}`);
        this.res.set("Content-Type", "application/json");
        this.res.send(JSON.stringify(formattedDocuments));
    }
}

export class GetComp extends HTTPRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        super(req, res, next, db);
    }

    /**
     * This method returns the JSON string payload of a list of comps after making a GET /comps request.
     */
    public async send_response() {
        const documents = (await this.db.raidCompositionModel.find().populate("categories")) as IRaidCompositionPopulatedDocument[];
        const filteredDocuments = documents.filter(document =>{ return document.name == this.req.params["comp"]; });
        let formattedDocument = {};

        if (filteredDocuments.length > 0)
        {
            formattedDocument = {
                name: filteredDocuments[0].name,
                categories: filteredDocuments[0].categories.map(category => {
                    return category.name
                }),
                roles: filteredDocuments[0].roles.map(role => {
                    return {
                        name: role.name,
                        requiredParticipants: role.requiredParticipants
                    }
                })
            };
        }
        else {
            throw new ResourceNotFoundException(this.req.params["comp"]);
        }
        Logger.Log(Severity.Debug, `Sending one comp in payload with name ${this.req.params["comp"]}`);
        this.res.set("Content-Type", "application/json");
        this.res.send(JSON.stringify(formattedDocument));
    }
}