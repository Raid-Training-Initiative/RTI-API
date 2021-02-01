import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import InvalidQueryParametersException from "../exceptions/InvalidQueryParametersException";

export class Comps {
    // A list of query parameters that this endpoint takes.
    public static validRequestQueryParameters: string[] = [
        "categories"
    ];

    /**
     * This method validates the request to the comps endpoint and returns an error payload if validation fails.
     * @param req The request being made.
     * @param next The function to perform next in the stack.
     */
    public static async validate_request(req: Request, res: Response, next: NextFunction): Promise<boolean> {
        let validated: boolean = true;
        Object.keys(req.query).forEach(key => {
            if (Comps.validRequestQueryParameters.indexOf(key) == -1) {
                validated = false;
                next(new InvalidQueryParametersException(key));
            }
        });

        return validated;
    }

    /**
     * This method returns the JSON string payload of a list of comps after making a GET /comps request.
     * @param db The MongoDB database instance containing the data we wish to send as a payload.
     * @returns A JSON list containing compositions, each with a name, list of categories, and list of roles.
     */
    public static async send_response(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        const documents = (await db.raidCompositionModel.find().populate("categories")) as IRaidCompositionPopulatedDocument[];
        const formattedDocuments = documents.filter(document =>{
                if (req.query["categories"]) { // If there are categories to filter with.
                    const filterCategories = (req.query["categories"] as string).split(",");
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
        
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(formattedDocuments));
    }
}