/**
 * File for classes that handle requests for training requests.
 */

import { NextFunction, Request, Response } from "express";
import DB from "../util/DB";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import Utils, { PaginatedResponse } from "../util/Utils";
import { TrainingRequestDisabledReason } from "@RTIBot-DB/documents/ITrainingRequestDocument";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import HTTPGetRequest from "./base/HTTPGetRequest";
import {
    TrainingRequestDto,
    TrainingRequestSummaryDto,
} from "./dto/trainingRequest.dto";
import { ITrainingRequestModel } from "@RTIBot-DB/schemas/TrainingRequestSchema";
import { FilterQuery } from "mongoose";

export class ListTrainingRequests extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [
        "users",
        "keywords",
        "active",
        "wings",
        "disabledReasons",
        "roles",
        "format",
        "page",
        "pageSize",
    ];

    private filterQuery: {
        active?: boolean;
        disabledReasons: string[];
        wings: number[];
        roles?: boolean;
    };

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            paginated: true,
            multiFormat: true,
            authenticated: true,
        });

        this.filterQuery = { disabledReasons: [], wings: [] };
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["active"]) {
            const activeString: string = this._req.query["active"]
                .toString()
                .toLowerCase();
            if (activeString != "true" && activeString != "false") {
                throw new BadSyntaxException(
                    "Query parameter active must be either true or false.",
                );
            }

            this.filterQuery.active = activeString == "true";
        }

        if (this._req.query["disabledReasons"]) {
            const disabledReasonStrings: string[] = this._req.query[
                "disabledReasons"
            ]
                .toString()
                .toLowerCase()
                .split(",");

            disabledReasonStrings.forEach((disabledReasonString) => {
                const supportedValues: string[] = Object.values(
                    TrainingRequestDisabledReason,
                );
                const supportedValuesLowercase: string[] = supportedValues.map(
                    (value) => value.toLowerCase(),
                );
                if (!supportedValuesLowercase.includes(disabledReasonString)) {
                    throw new BadSyntaxException(
                        `Query parameter disabledReasons must be one of the following values: ${supportedValues.join(
                            ", ",
                        )}`,
                    );
                }

                this.filterQuery.disabledReasons.push(disabledReasonString);
            });
        }

        if (this._req.query["wings"]) {
            const wingStrings: string[] = this._req.query["wings"]
                .toString()
                .toLowerCase()
                .split(",");
            wingStrings.forEach((wingString) => {
                const wingNum = Number.parseInt(wingString);
                if (Number.isNaN(wingNum)) {
                    throw new BadSyntaxException(
                        "Query parameter wings must include only numbers.",
                    );
                }
                this.filterQuery.wings.push(wingNum);
            });
        }

        if (this._req.query["roles"]) {
            const rolesString: string = this._req.query["roles"]
                .toString()
                .toLowerCase();
            if (rolesString != "true" && rolesString != "false") {
                throw new BadSyntaxException(
                    "Query parameter roles must be either true or false.",
                );
            }

            this.filterQuery.roles = rolesString == "true";
        }
    }

    /**
     * Returns a list of training requests after making a GET /trainingrequests request.
     * @returns A list of objects representing training requests.
     */
    public async prepareResponse(
        paginated: {
            page: number;
            pageSize: number;
        } = { page: 1, pageSize: 100 },
    ): Promise<
        | PaginatedResponse<TrainingRequestSummaryDto, "trainingRequests">
        | string[]
    > {
        const documents = await DB.queryTrainingRequests(
            await this.dbFilter(),
            paginated,
        );

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach((document) => idArray.push(document.userId));
        const idMap: Map<string, string | undefined> =
            await Utils.idsToMap(idArray);

        if (this.responseFormat == "csv") {
            return documents
                .filter((document) => idMap.get(document.userId)) // Filtering out the users that aren't on the Discord anymore.
                .map((document) => {
                    const wingsData: string[] = [];
                    for (let i = 1; i <= 7; i++) {
                        if (document.history.get(i.toString())) {
                            if (
                                document.history.get(i.toString())
                                    ?.requestedDate &&
                                document.history.get(i.toString())?.clearedDate
                            ) {
                                wingsData.push(
                                    `Cleared on ${
                                        document.history
                                            .get(i.toString())
                                            ?.clearedDate?.toISOString()
                                            .split("T")[0]
                                    }`,
                                );
                            } else if (
                                document.history.get(i.toString())
                                    ?.requestedDate
                            ) {
                                wingsData.push(
                                    `Requested on ${
                                        document.history
                                            .get(i.toString())
                                            ?.requestedDate?.toISOString()
                                            .split("T")[0]
                                    }`,
                                );
                            } else if (
                                document.history.get(i.toString())?.clearedDate
                            ) {
                                wingsData.push(`Already cleared`);
                            } else {
                                wingsData.push("");
                            }
                        } else {
                            wingsData.push(`Not requested`);
                        }
                    }
                    return `"${idMap.get(document.userId)}","${
                        document.userId
                    }","${document.active}","${wingsData.join('","')}","${
                        document._id
                    }"`;
                });
        }

        return {
            totalElements: await DB.queryTrainingRequestsCount(
                await this.dbFilter(),
            ),
            trainingRequests: documents.map((document) =>
                TrainingRequestSummaryDto.fromDocument(document, idMap),
            ),
        };
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @returns A filter to pass into the database query.
     */
    private async dbFilter(): Promise<FilterQuery<ITrainingRequestModel>> {
        const filters: FilterQuery<ITrainingRequestModel>[] = [];

        if (this._req.query["users"]) {
            const filterUsers: string[] = this._req.query["users"]
                .toString()
                .split(",");
            const memberMap: Map<string | undefined, string> =
                await Utils.namesToMap(filterUsers);
            filters.push({ userId: { $in: Array.from(memberMap.values()) } });
        }
        if (this._req.query["keywords"]) {
            const filterKeywords: string[] = this._req.query["keywords"]
                .toString()
                .split(",");
            const keywordQuery: string = `"${filterKeywords.join('","')}"`;
            filters.push({ $text: { $search: keywordQuery } });
        }
        if (this.filterQuery.active !== undefined) {
            filters.push({ active: this.filterQuery.active });
        }
        if (this.filterQuery.wings.length > 0) {
            filters.push({ requestedWings: { $in: this.filterQuery.wings } });
        }
        if (this.filterQuery.roles !== undefined) {
            if (this.filterQuery.roles) {
                filters.push({
                    requestedRoles: { $exists: true },
                    $expr: { $gt: [{ $size: "$requestedRoles" }, 0] },
                });
            } else {
                filters.push({
                    $or: [
                        { requestedRoles: { $exists: false } },
                        { $expr: { $eq: [{ $size: "$requestedRoles" }, 0] } },
                    ],
                });
            }
        }
        if (this.filterQuery.disabledReasons.length > 0) {
            const filterDisabledReasons: RegExp[] =
                Utils.getReqexListFromStringList(
                    this.filterQuery.disabledReasons,
                );
            filters.push({ disabledReason: { $in: filterDisabledReasons } });
        }

        return filters.length > 0 ? { $and: filters } : {};
    }
}

export class GetTrainingRequest extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns a raid after making a GET /trainingrequests/:userid request.
     * @throws {ResourceNotFoundException} When the raid cannot be found.
     * @returns An object representing a raid.
     */
    public async prepareResponse(): Promise<TrainingRequestDto> {
        const document = await DB.queryTrainingRequest(
            this._req.params["userid"],
        );
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["userid"]);
        }

        return TrainingRequestDto.fromDocument(
            document,
            await Utils.idsToMap([document.userId]),
        );
    }
}
