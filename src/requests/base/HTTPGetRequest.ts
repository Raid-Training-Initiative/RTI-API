import { NextFunction, Request, Response } from "express";
import HTTPException from "../../exceptions/base/HTTPException";
import ServerErrorException from "../../exceptions/ServerErrorException";
import { Logger, Severity } from "../../util/Logger";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";
import BadSyntaxException from "../../exceptions/BadSyntaxException";
import Utils from "../../util/Utils";
import RequestOptions from "./RequestOptions";
import HTTPRequest from "./HTTPRequest";

export default abstract class HTTPGetRequest extends HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.

    private paginated: boolean; // Does the request support pagination?
    private multiFormat: boolean; // Does the request provide responses in multiple different formats?
    
    private pagination: {page: number, pageSize: number};

    constructor(req: Request, res: Response, next: NextFunction, options?: RequestOptions) {
        super(req, res, next, options);
        if (options) { // If additional options are specified.
            this.paginated = options.paginated ? options.paginated : false;
            this.multiFormat = options.multiFormat ? options.multiFormat : false;
        }
    }

    /**
     * Validates the request and throws an error if validation fails.
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     * @throws {BadSyntaxException} When a query parameter isn't one of the supported values.
     */
    public validate_request() {
        super.validate_request();
        if (this.paginated) this.validate_pagination();
        if (this.multiFormat) this.validate_format_param();
    }

    /**
     * Validates the format query parameter and throws an error if validation fails.
     * @throws {BadSyntaxException} When the format query parameter isn't one of the supported values.
     */
    public validate_format_param() {
        if (this.req.query["format"]) {
            const formatString: string = this.req.query["format"]?.toString().toLowerCase();
            if (formatString != "csv" && formatString != "json") {
                throw new BadSyntaxException("Query parameter format must be either csv or json.");
            }
        }
    }

    /**
     * Checks if the pagination query parameters entered into the request are valid or not. If they are, they are added as class variables.
     * @throws {BadSyntaxException} When query parameters are invalid (one of them is missing or they're not valid positive numbers).
     */
    private validate_pagination() {
        const page = this.req.query["page"]?.toString();
        const pageSize = this.req.query["pageSize"]?.toString();
        if (!(page == undefined && pageSize == undefined)) {
            if ((page == undefined || pageSize == undefined)) {
                throw new BadSyntaxException("For pagination of response, both page and pageSize query parameters must be included");
            } else {
                const pageNum: number = Number.parseInt(page);
                const pageSizeNum: number = Number.parseInt(pageSize);
                if ((isNaN(pageNum)) || (isNaN(pageSizeNum))) {
                    throw new BadSyntaxException("Query parameters page and pageSize must be valid numbers");
                } else {
                    if (pageNum <= 0 || pageSizeNum <= 0) {
                        throw new BadSyntaxException("Query parameters page and pageSize must be greater than 0");
                    } else {
                        this.pagination = { page: pageNum, pageSize: pageSizeNum };
                    }
                }
            }
        }
    }

    public get client_id() {
        return this._client_id;
    }

    /**
     * Executes the request and handles errors.
     */
     public async run() {
        try
        {
            Logger.log_request(Severity.Debug, this.timestamp, `Request: ${this.req.method} ${this.req.url}`);
            this.validate_request();
            const documents: Object[] | Object = this.pagination ? await this.prepare_response(this.pagination) : await this.prepare_response();
            this.send_response(documents);
        } catch (exception) {
            if (exception instanceof HTTPException) {
                Logger.log_http_error(Severity.Warn, this.timestamp, exception);
                this.next(exception);
            } else if (exception.kind == "ObjectId") { // If the object ID cast failed
                const notFound: ResourceNotFoundException = new ResourceNotFoundException(exception.value);
                Logger.log_http_error(Severity.Warn, this.timestamp, notFound);
                this.next(notFound);
            } else {
                Logger.log_error(Severity.Error, exception);
                this.next(new ServerErrorException(exception.message));
            }
        }
    }

    protected send_response(documents: Object[] | Object) {
        const filterString: string = Utils.generate_filter_string(this.validRequestQueryParameters, this.req);
        Logger.log_request(Severity.Debug, this.timestamp, `Sending ${Array.isArray(documents) ? documents.length : 1} items in payload with ${filterString.length > 0 ? "filter - " + filterString : "no filter"}`);
        
        let payload: string = "";
        const format: string | undefined = this.multiFormat && this.req.query["format"] ? this.req.query["format"].toString().toLowerCase() : undefined; 
        if (format == "csv") {
            payload = Array.isArray(documents) ? documents.join("\n") : payload;
            this.res.set("Content-Type", "application/csv");
        } else {
            payload = JSON.stringify(documents);
            this.res.set("Content-Type", "application/json");
        }
        
        this.res.send(payload);
    }
}