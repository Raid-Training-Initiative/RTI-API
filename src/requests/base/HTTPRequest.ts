import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import InvalidQueryParametersException from "../../exceptions/InvalidQueryParametersException";
import Auth from "../../util/auth/Auth";
import { Logger, Severity } from "../../util/Logger";
import IRequestOptions from "./IRequestOptions";
import BadSyntaxException from "../../exceptions/BadSyntaxException";
import IAuthenticatedClient from "../../util/auth/clients/IAuthenticatedClient";

export default abstract class HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.
    public abstract prepareResponse(pagination?: {
        page: number;
        pageSize: number;
    }); // Returns a list of objects to put in the response payload.
    protected abstract run(): void;
    protected abstract sendResponse(
        documents?: Record<string, unknown>[] | Record<string, unknown>,
    ): void;

    protected _req: Request;
    protected _res: Response;
    protected _next: NextFunction;
    protected _db: MongoDatabase;
    protected _timestamp: string;
    protected _client: IAuthenticatedClient | undefined;
    protected _authenticated: boolean;

    constructor(
        req: Request,
        res: Response,
        next: NextFunction,
        options?: IRequestOptions,
    ) {
        this._req = req;
        this._res = res;
        this._next = next;
        this._authenticated = options?.authenticated ?? false;
        this._timestamp = Date.now().toString();
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
        if (this._authenticated) {
            await this.validateAuthentication();
        }
        this.validateQueryParameters();
    }

    /**
     * Checks if the authentication is valid (i.e. Authorization header contains a valid client secret).
     * @throws {BadSyntaxException} When the Authorization header is empty or contains an invalid client secret.
     */
    private async validateAuthentication() {
        const auth: Auth = Auth.instance();
        const authHeader: string[] = (
            this._req.headers.authorization || ""
        ).split(" ");
        if (authHeader[0] != "Bearer") {
            throw new BadSyntaxException(
                `The Authorization header should be in the form "Bearer AUTH_TOKEN"`,
            );
        }

        const clientSecret: string = authHeader[1] || "";
        this._client = auth.authenticate(clientSecret);

        Logger.logRequest(
            Severity.Debug,
            this._timestamp,
            `Request called by: ${this._client.id}`,
        );
    }

    /**
     * Checks if the query parameters entered into the request are valid or not.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     */
    private validateQueryParameters() {
        Object.keys(this._req.query).forEach((key) => {
            if (this.validRequestQueryParameters.indexOf(key) == -1) {
                throw new InvalidQueryParametersException(key);
            }
        });
    }
}
