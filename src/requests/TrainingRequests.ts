/**
 * File for classes that handle requests for training requests.
 */

import { NextFunction, Request, Response } from "express";
import DB from "../util/DB";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import Utils from "../util/Utils";
import { TrainingRequestDisabledReason } from "@RTIBot-DB/documents/ITrainingRequestDocument";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";
import HTTPGetRequest from "./base/HTTPGetRequest";

export class ListTrainingRequests extends HTTPGetRequest {
  public validRequestQueryParameters: string[] = [
    "users",
    "keywords",
    "active",
    "wings",
    "disabledReasons",
    "format",
    "page",
    "pageSize",
  ];

  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, {
      authenticated: {
        permissions: [MemberPermission.VIEW_TR],
      },
      paginated: true,
      multiFormat: true,
    });
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
          "Query parameter active must be either true or false."
        );
      }
    }
    if (this._req.query["disabledReasons"]) {
      const disabledReasonStrings: string[] = this._req.query["disabledReasons"]
        .toString()
        .toLowerCase()
        .split(",");
      disabledReasonStrings.forEach((disabledReasonString) => {
        const supportedValues: string[] = Object.values(
          TrainingRequestDisabledReason
        );
        const supportedValuesLowercase: string[] = supportedValues.map(
          (value) => value.toLowerCase()
        );
        if (!supportedValuesLowercase.includes(disabledReasonString)) {
          throw new BadSyntaxException(
            `Query parameter disabledReasons must be one of the following values: ${supportedValues.join(
              ", "
            )}`
          );
        }
      });
    }
    if (this._req.query["wings"]) {
      const wingStrings: string[] = this._req.query["wings"]
        .toString()
        .toLowerCase()
        .split(",");
      wingStrings.forEach((wingString) => {
        if (!Number.parseInt(wingString)) {
          throw new BadSyntaxException(
            "Query parameter wings must include only numbers."
          );
        }
      });
    }
  }

  /**
   * Returns a list of training requests after making a GET /trainingrequests request.
   * @returns A list of objects representing training requests.
   */
  public async prepareResponse(paginated?: {
    page: number;
    pageSize: number;
  }): Promise<Object[]> {
    const documents = await DB.queryTrainingRequests(
      await this.dbFilter(),
      paginated
    );

    // Resolve the IDs to names.
    const idArray = new Array<string>();
    documents.forEach((document) => idArray.push(document.userId));
    const idMap: Map<string, string | undefined> = await Utils.idsToMap(
      idArray
    );

    let formattedDocuments: Object[];
    if (
      this._req.query["format"] &&
      this._req.query["format"].toString().toLowerCase() == "csv"
    ) {
      formattedDocuments = documents
        .filter((document) => idMap.get(document.userId)) // Filtering out the users that aren't on the Discord anymore.
        .map((document) => {
          const wingsData: string[] = [];
          for (let i = 1; i <= 7; i++) {
            if (document.history.get(i.toString())) {
              if (
                document.history.get(i.toString())?.requestedDate &&
                document.history.get(i.toString())?.clearedDate
              ) {
                wingsData.push(
                  `Cleared on ${
                    document.history
                      .get(i.toString())
                      ?.clearedDate?.toISOString()
                      .split("T")[0]
                  }`
                );
              } else if (document.history.get(i.toString())?.requestedDate) {
                wingsData.push(
                  `Requested on ${
                    document.history
                      .get(i.toString())
                      ?.requestedDate?.toISOString()
                      .split("T")[0]
                  }`
                );
              } else if (document.history.get(i.toString())?.clearedDate) {
                wingsData.push(`Already cleared`);
              } else {
                wingsData.push("");
              }
            } else {
              wingsData.push(`Not requested`);
            }
          }
          return `"${idMap.get(document.userId)}","${document.userId}","${
            document.active
          }","${wingsData.join(",")}"`;
        });
    } else {
      formattedDocuments = documents.map((document) => {
        return {
          discordTag: idMap.get(document.userId),
          active: document.active,
          requestedWings: document.requestedWings,
          comment: document.comment,
          created: Utils.formatDatetimeString(document.creationDate),
          edited: Utils.formatDatetimeString(document.lastEditedTimestamp),
          disabledReason: document.disabledReason,
          userId: document.userId,
        };
      });
    }

    return formattedDocuments;
  }

  /**
   * Filters the documents according to the filters specified in the query parameters.
   * @returns A filter to pass into the database query.
   */
  private async dbFilter(): Promise<Object> {
    const filters: Object[] = [];

    if (this._req.query["users"]) {
      const filterUsers: string[] = this._req.query["users"]
        .toString()
        .split(",");
      const memberMap: Map<string | undefined, string> = await Utils.namesToMap(
        filterUsers
      );
      filters.push({ userId: { $in: Array.from(memberMap.values()) } });
    }
    if (this._req.query["keywords"]) {
      const filterKeywords: string[] = this._req.query["keywords"]
        .toString()
        .split(",");
      const keywordQuery: string = `"${filterKeywords.join('","')}"`;
      filters.push({ $text: { $search: keywordQuery } });
    }
    if (this._req.query["active"]) {
      filters.push({
        active: this._req.query["active"].toString().toLowerCase() == "true",
      });
    }
    if (this._req.query["wings"]) {
      const filterWings: number[] = this._req.query["wings"]
        .toString()
        .split(",")
        .map((wing) => Number.parseInt(wing));
      filters.push({ requestedWings: { $in: filterWings } });
    }
    if (this._req.query["disabledReasons"]) {
      const filterDisabledReasons: RegExp[] = Utils.getRegexListFromQueryString(
        this._req.query["disabledReasons"].toString()
      );
      filters.push({ disabledReason: { $in: filterDisabledReasons } });
    }

    return filters.length > 0 ? { $and: filters } : {};
  }
}

export class GetTrainingRequest extends HTTPGetRequest {
  public validRequestQueryParameters: string[] = [];

  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, {
      authenticated: {
        permissions: [MemberPermission.VIEW_TR],
      },
    });
  }

  /**
   * Returns a raid after making a GET /trainingrequests/:userid request.
   * @throws {ResourceNotFoundException} When the raid cannot be found.
   * @returns An object representing a raid.
   */
  public async prepareResponse(): Promise<Object> {
    const document = await DB.queryTrainingRequest(this._req.params["userid"]);
    if (document == undefined) {
      throw new ResourceNotFoundException(this._req.params["userid"]);
    }
    const discordTag = (await Utils.idsToMap([document.userId])).get(
      document.userId
    );
    const historyMap: Object = {};
    document.history.forEach(
      (value, key) =>
        (historyMap[key] = {
          requested: Utils.formatDatetimeString(value.requestedDate),
          cleared: Utils.formatDatetimeString(value.clearedDate),
        })
    );

    const formattedDocument = {
      discordTag: discordTag,
      active: document.active,
      requestedWings: document.requestedWings,
      comment: document.comment,
      created: Utils.formatDatetimeString(document.creationDate),
      edited: Utils.formatDatetimeString(document.lastEditedTimestamp),
      disabledReason: document.disabledReason,
      userId: document.userId,
      history: historyMap,
    };

    return formattedDocument;
  }
}
