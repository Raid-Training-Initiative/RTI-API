import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import InvalidQueryParametersException from "../../exceptions/InvalidQueryParametersException";
import Auth from "../../util/Auth/Auth";
import { Logger, Severity } from "../../util/Logger";
import RequestOptions from "./RequestOptions";
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
    public abstract prepareResponse(pagination?: {page: number, pageSize: number}); // Returns a list of objects to put in the response payload.
    protected abstract run(): void;
    protected abstract sendResponse(documents?: Object[] | Object): void;

    protected _req: Request;
    protected _res: Response;
    protected _next: NextFunction;
    protected _db: MongoDatabase;
    protected _timestamp: string;
    protected _client: IAuthenticatedClient | undefined;

    private _authenticated: boolean; // Does the request require authentication?
    private _requiredPermissions: MemberPermission[];


    constructor(req: Request, res: Response, next: NextFunction, options?: RequestOptions) {
        this._req = req;
        this._res = res;
        this._next = next;
        this._timestamp = Date.now().toString();
        if (options) { // If additional options are specified.
            this._authenticated = options.authenticated !== undefined;
            this._requiredPermissions = options.authenticated ? options.authenticated.permissions : [];
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
     * @throws {JsonValidationErrorException} When the request body does not follow the JSON schema.
     */
    public async validateRequest() {
        if (this._authenticated) await this.validateAuthentication();
        this.validateQueryParameters();
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
}
