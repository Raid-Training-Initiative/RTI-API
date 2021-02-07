import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import HTTPException from "../exceptions/HTTPException";
import ServerErrorException from "../exceptions/ServerErrorException";
import InvalidQueryParametersException from "../exceptions/InvalidQueryParametersException";
import Auth from "../util/Auth";
import UnauthorizedException from "../exceptions/UnauthorizedException";
import { Logger, Severity } from "../util/Logger";

export default abstract class HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.
    public abstract send_response(): Promise<void>;

    protected req: Request;
    protected res: Response;
    protected next: NextFunction;
    protected db: MongoDatabase;
    protected timestamp: string;
    protected _client_id;

    constructor(req: Request, res: Response, next: NextFunction, db: MongoDatabase) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.db = db;
        this.timestamp = Date.now().toString();
    }

    /**
     * This method validates the request and returns an error payload if validation fails.
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     */
    public async validate_request() {
        await this.validate_authentication();
        await this.validate_query_parameters();
    }

    /**
     * This method checks if the authentication is valid (i.e. Authorization header contains a valid client secret).
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     */
    private async validate_authentication() {
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

        Logger.LogRequest(Severity.Debug, this.timestamp, `Request called by: ${this._client_id}`)
    }

    /**
     * This method checks if the query parameters entered into the request are valid or not.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     */
    private async validate_query_parameters() {
        Object.keys(this.req.query).forEach(key => {
            if (this.validRequestQueryParameters.indexOf(key) == -1) {
                throw new InvalidQueryParametersException(key);
            }
        });
    }

    public get client_id() {
        return this._client_id;
    }

    /**
     * This method executes the request.
     */
    public async run() {
        try {
            Logger.LogRequest(Severity.Debug, this.timestamp, `Request: ${this.req.method} ${this.req.url}`);
            await this.validate_request();
            await this.send_response();
        }
        catch (exception) {
            if (exception instanceof HTTPException) {
                Logger.LogHTTPError(Severity.Warn, this.timestamp, exception);
                this.next(exception);
            } else {
                Logger.LogError(Severity.Error, exception);
                this.next(new ServerErrorException(exception.message));
            }
        }
    }
}