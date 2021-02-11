import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import HTTPException from "../../exceptions/HTTPException";
import ServerErrorException from "../../exceptions/ServerErrorException";
import InvalidQueryParametersException from "../../exceptions/InvalidQueryParametersException";
import Auth from "../../util/Auth";
import UnauthorizedException from "../../exceptions/UnauthorizedException";
import { Logger, Severity } from "../../util/Logger";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";
import BadSyntaxException from "../../exceptions/BadSyntaxException";

export default abstract class HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.
    public abstract send_response(pagination?: {page: number, pageSize: number}): Promise<void>;

    protected req: Request;
    protected res: Response;
    protected next: NextFunction;
    protected db: MongoDatabase;
    protected timestamp: string;
    protected _client_id;

    private authenticated: boolean;
    private paginated: boolean;
    private pagination: {page: number, pageSize: number};

    constructor(req: Request, res: Response, next: NextFunction, options?: {authenticated: boolean, paginated: boolean}) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.timestamp = Date.now().toString();
        this.authenticated = options ? options.authenticated : false;
        this.paginated = options ? options.authenticated : false;
    }

    /**
     * Validates the request and returns an error payload if validation fails.
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     */
    public async validate_request() {
        if (this.authenticated) this.validate_authentication();
        this.validate_query_parameters();
        if (this.paginated) this.validate_pagination();
    }

    /**
     * Checks if the authentication is valid (i.e. Authorization header contains a valid client secret).
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     */
    private validate_authentication() {
        const auth: Auth = Auth.instance();
        const auth_header: string[] = (this.req.headers.authorization || "").split(" ");
        if (auth_header[0] != "Basic") {
            throw new UnauthorizedException();
        }

        const client_secret: string = auth_header[1] || "";
        this._client_id = auth.return_client_id(client_secret);
        if (this._client_id == undefined) {
            throw new UnauthorizedException();
        }

        Logger.log_request(Severity.Debug, this.timestamp, `Request called by: ${this._client_id}`)
    }

    /**
     * Checks if the query parameters entered into the request are valid or not.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     */
    private validate_query_parameters() {
        Object.keys(this.req.query).forEach(key => {
            if (this.validRequestQueryParameters.indexOf(key) == -1) {
                throw new InvalidQueryParametersException(key);
            }
        });
    }

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
        try {
            Logger.log_request(Severity.Debug, this.timestamp, `Request: ${this.req.method} ${this.req.url}`);
            await this.validate_request();
            this.pagination ? await this.send_response(this.pagination) : await this.send_response();
        }
        catch (exception) {
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
}