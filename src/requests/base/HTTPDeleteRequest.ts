import { NextFunction, Request, Response } from "express";
import HTTPException from "../../exceptions/base/HTTPException";
import ServerErrorException from "../../exceptions/ServerErrorException";
import { Logger, Severity } from "../../util/Logger";
import ResourceNotFoundException from "../../exceptions/ResourceNotFoundException";
import IRequestOptions from "./IRequestOptions";
import HTTPRequest from "./HTTPRequest";

export default abstract class HTTPDeleteRequest extends HTTPRequest {

    constructor(req: Request, res: Response, next: NextFunction, options?: IRequestOptions) {
        super(req, res, next, options);
    }

    /**
     * Executes the request and handles errors.
     */
    public async run() {
        try
        {
            Logger.logRequest(Severity.Debug, this._timestamp, `Request: ${this._req.method} ${this._req.url}`);
            await this.validateRequest();
            await this.prepareResponse();
            this.sendResponse();
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

    protected sendResponse() {
        Logger.logRequest(Severity.Debug, this._timestamp, `Sending successful deletion response`);
        this._res.status(204);
        this._res.send();
    }
}