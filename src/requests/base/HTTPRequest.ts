import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import HTTPException from "../../exceptions/base/HTTPException";
import ServerErrorException from "../../exceptions/ServerErrorException";
import InvalidQueryParametersException from "../../exceptions/InvalidQueryParametersException";
import Auth from "../../util/Auth/Auth";
import { Logger, Severity } from "../../util/Logger";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";
import BadSyntaxException from "../../exceptions/BadSyntaxException";
import Utils from "../../util/Utils";
import RequestOptions from "./IRequestOptions";
import InvalidAuthenticationException from "../../exceptions/InvalidAuthenticationException";
import IAuthenticatedClient from "../../util/Auth/clients/IAuthenticatedClient";
import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";
import UnauthorizedException from "../../exceptions/UnauthorizedException";

export default abstract class HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.
    public abstract prepareResponse(pagination?: {page: number, pageSize: number}): Promise<Object[] | Object>; // Returns a list of objects to put in the response payload.

    protected _req: Request;
    protected _res: Response;
    protected _next: NextFunction;
    protected _db: MongoDatabase;
    protected _timestamp: string;
    protected _client: IAuthenticatedClient | undefined;

    private _paginated: boolean; // Does the request support pagination?
    private _authenticated: boolean; // Does the request require authentication?
    private _requiredPermissions: MemberPermission[];
    private _multiFormat: boolean; // Does the request provide responses in multiple different formats?
    
    private _pagination: {page: number, pageSize: number};

    constructor(req: Request, res: Response, next: NextFunction, options?: RequestOptions) {
        this._req = req;
        this._res = res;
        this._next = next;
        this._timestamp = Date.now().toString();
        if (options) { // If additional options are specified.
            this._authenticated = options.authenticated !== undefined;
            this._requiredPermissions = options.authenticated ? options.authenticated.permissions : [];
            this._paginated = options.paginated ? options.paginated : false;
            this._multiFormat = options.multiFormat ? options.multiFormat : false;
        }
    }
    
    public get client(): IAuthenticatedClient | undefined {
        return this._client;
    }

    public get clientId(): string | undefined {
        return this._client?.id;
    }

    /**
     * Validates the request and throws an error if validation fails.
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     * @throws {BadSyntaxException} When a query parameter isn't one of the supported values.
     */
    public async validateRequest() {
        if (this._authenticated) await this.validateAuthentication();
        this.validateQueryParameters();
        if (this._paginated) this.validatePagination();
        if (this._multiFormat) this.validateFormatParam();
    }

    /**
     * Validates the format query parameter and throws an error if validation fails.
     * @throws {BadSyntaxException} When the format query parameter isn't one of the supported values.
     */
    public validateFormatParam() {
        if (this._req.query["format"]) {
            const formatString: string = this._req.query["format"]?.toString().toLowerCase();
            if (formatString != "csv" && formatString != "json") {
                throw new BadSyntaxException("Query parameter format must be either csv or json.");
            }
        }
    }

    /**
     * Checks if the authentication is valid (i.e. Authorization header contains a valid client secret).
     * @throws {InvalidAuthenticationException} When the Authorization header is empty or contains an invalid client secret.
     */
    private async validateAuthentication() {
        const auth: Auth = Auth.instance();
        const authHeader: string[] = (this._req.headers.authorization || "").split(" ");
        if (authHeader[0] != "Bearer") {
            throw new InvalidAuthenticationException();
        }

        const clientSecret: string = authHeader[1] || "";
        this._client = auth.authenticate(clientSecret);

        await this.validatePermissions(this._client);

        Logger.logRequest(Severity.Debug, this._timestamp, `Request called by: ${this._client.id}`)
    }

    /**
     * Checks if the client making the request has the necessary permissions.
     * @param client The client holding the permissions.
     * @throws {UnauthorizedException} When the permissions are not sufficient for making the request.
     */
    private async validatePermissions(client: IAuthenticatedClient) {
        if (!(await client.hasPermissions(this._requiredPermissions))) {
            throw new UnauthorizedException("Invalid permissions");
        }
    }

    /**
     * Checks if the query parameters entered into the request are valid or not.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     */
    private validateQueryParameters() {
        Object.keys(this._req.query).forEach(key => {
            if (this.validRequestQueryParameters.indexOf(key) == -1) {
                throw new InvalidQueryParametersException(key);
            }
        });
    }

    /**
     * Checks if the pagination query parameters entered into the request are valid or not. If they are, they are added as class variables.
     * @throws {BadSyntaxException} When query parameters are invalid (one of them is missing or they're not valid positive numbers).
     */
    private validatePagination() {
        const page = this._req.query["page"]?.toString();
        const pageSize = this._req.query["pageSize"]?.toString();
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
                        this._pagination = { page: pageNum, pageSize: pageSizeNum };
                    }
                }
            }
        }
    }

    /**
     * Executes the request and handles errors.
     */
    public async run() {
        try
        {
            Logger.logRequest(Severity.Debug, this._timestamp, `Request: ${this._req.method} ${this._req.url}`);
            await this.validateRequest();
            const documents: Object[] | Object = this._pagination ? await this.prepareResponse(this._pagination) : await this.prepareResponse();
            this.sendResponse(documents);
        } catch (exception) {
            if (exception instanceof HTTPException) {
                Logger.logHttpError(Severity.Warn, this._timestamp, exception);
                this._next(exception);
            } else if (exception.kind == "ObjectId") { // If the object ID cast failed
                const notFound: ResourceNotFoundException = new ResourceNotFoundException(exception.value);
                Logger.logHttpError(Severity.Warn, this._timestamp, notFound);
                this._next(notFound);
            } else {
                Logger.logError(Severity.Error, exception);
                this._next(new ServerErrorException(exception.message));
            }
        }
    }

    private sendResponse(documents: Object[] | Object) {
        const filterString: string = Utils.generateFilterString(this.validRequestQueryParameters, this._req);
        Logger.logRequest(Severity.Debug, this._timestamp, `Sending ${Array.isArray(documents) ? documents.length : 1} items in payload with ${filterString.length > 0 ? "filter - " + filterString : "no filter"}`);
        
        let payload: string = "";
        const format: string | undefined = this._multiFormat && this._req.query["format"] ? this._req.query["format"].toString().toLowerCase() : undefined; 
        if (format == "csv") {
            payload = Array.isArray(documents) ? documents.join("\n") : payload;
            this._res.set("Content-Type", "application/csv");
        } else {
            payload = JSON.stringify(documents);
            this._res.set("Content-Type", "application/json");
        }
        
        this._res.send(payload);
    }
}
