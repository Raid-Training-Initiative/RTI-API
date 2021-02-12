/**
 * File for classes that handle requests for training requests.
 */

import { NextFunction, Request, Response } from "express";
import HTTPRequest from "./base/HTTPRequest";

export class ListTrainingRequests extends HTTPRequest {
    public validRequestQueryParameters: string[] = [
        "keywords",
        "active",
        "wings"
    ];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {authenticated: true, paginated: true, multiFormat: true});
    }

    /**
     * Returns a list of training requests after making a GET /trainingrequests request.
     * @returns A list of objects representing training requests.
     */
    public async prepare_response(): Promise<Object[]> {
        return [];
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @returns A filter to pass into the database query.
     */
    private async db_filter(): Promise<Object> {
        return {};
    }
}