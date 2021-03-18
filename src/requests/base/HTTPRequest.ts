import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { NextFunction, Request, Response } from "express";
import InvalidQueryParametersException from "../../exceptions/InvalidQueryParametersException";
import Auth from "../../util/Auth";
import UnauthorizedException from "../../exceptions/UnauthorizedException";
import { Logger, Severity } from "../../util/Logger";
import RequestOptions from "./RequestOptions";

export default abstract class HTTPRequest {
    public abstract validRequestQueryParameters: string[]; // A list of query parameters that this endpoint takes.
    public abstract prepare_response(pagination?: {page: number, pageSize: number}); // Returns a list of objects to put in the response payload.
    protected abstract run(): void;
    protected abstract send_response(documents?: Object[] | Object): void;

    protected req: Request;
    protected res: Response;
    protected next: NextFunction;
    protected db: MongoDatabase;
    protected timestamp: string;
    protected _client_id: string | undefined;

    private authenticated: boolean; // Does the request require authentication?

    constructor(req: Request, res: Response, next: NextFunction, options?: RequestOptions) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.timestamp = Date.now().toString();
        if (options) { // If additional options are specified.
            this.authenticated = options.authenticated ? options.authenticated : false;
        }
    }

    /**
     * Validates the request and throws an error if validation fails.
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     * @throws {InvalidQueryParametersException} When a query parameter was specified that is not part of the accepted list of parameters.
     * @throws {BadSyntaxException} When a query parameter isn't one of the supported values.
     * @throws {JsonValidationErrorException} When the request body does not follow the JSON schema.
     */
    public validate_request() {
        if (this.authenticated) this.validate_authentication();
        this.validate_query_parameters();
    }

    /**
     * Checks if the authentication is valid (i.e. Authorization header contains a valid client secret).
     * @throws {UnauthorizedException} When the Authorization header is empty or contains an invalid client secret.
     */
    private validate_authentication() {
        const auth: Auth = Auth.instance();
        const auth_header: string[] = (this.req.headers.authorization || "").split(" ");
        if (auth_header[0] != "Bearer") {
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
}