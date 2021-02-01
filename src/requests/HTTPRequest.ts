import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import InvalidQueryParametersException from "../exceptions/InvalidQueryParametersException";

export default abstract class HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.
    public abstract send_response(): void;

    req: Request;
    res: Response;
    next: NextFunction;
    db: MongoDatabase;

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.db = db;
    }

    /**
     * This method validates the request to the comps endpoint and returns an error payload if validation fails.
     * @returns Returns true if the validation succeeded and false otherwise.
     */
    public async validate_request(): Promise<boolean> {
        return this.validate_query_parameters();
    }

    private async validate_query_parameters(): Promise<boolean> {
        let validated: boolean = true;
        Object.keys(this.req.query).forEach(key => {
            if (this.validRequestQueryParameters.indexOf(key) == -1) {
                validated = false;
                this.next(new InvalidQueryParametersException(key));
            }
        });

        return validated;
    }

    public async run() {
        if (await this.validate_request()) {
            await this.send_response();
        }
    }
}