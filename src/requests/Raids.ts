/**
 * File for classes that handle requests for raids.
 */

import { NextFunction, Request, Response } from "express";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import DB from "../util/DB";
import Utils from "../util/Utils";
import HTTPGetRequest from "./base/HTTPGetRequest";
import escapeStringRegexp = require("escape-string-regexp");

export class ListRaids extends HTTPGetRequest {
  public validRequestQueryParameters: string[] = [
    "status",
    "name",
    "comps",
    "leader",
    "published",
    "participants",
    "reserves",
    "format",
    "page",
    "pageSize",
    "dateFrom",
    "dateTo",
    "showParticipants",
  ];

  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, {
      paginated: true,
      multiFormat: true,
      authenticated: true,
    });
  }

  /**
   * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
   * @throws {BadSyntaxException} When a query parameter doesn't have the correct value/format.
   */
  public async validateRequest() {
    await super.validateRequest();

    if (this._req.query["status"]) {
      const statusStrings: string[] = this._req.query["status"]
        .toString()
        .toLowerCase()
        .split(",");
      statusStrings.forEach((statusString) => {
        if (
          statusString != "draft" &&
          statusString != "published" &&
          statusString != "archived"
        ) {
          throw new BadSyntaxException(
            "Query parameter status must be either draft, published, or archived."
          );
        }
      });
    }
    if (this._req.query["published"]) {
      const publishedString: string = this._req.query["published"]
        .toString()
        .toLowerCase();
      if (publishedString != "true" && publishedString != "false") {
        throw new BadSyntaxException(
          "Query parameter published must be either true or false."
        );
      }
    }
    if (this._req.query["dateFrom"] || this._req.query["dateTo"]) {
      const timestampFrom: string | undefined =
        this._req.query["dateFrom"]?.toString();
      const timestampTo: string | undefined =
        this._req.query["dateTo"]?.toString();
      const regex: RegExp =
        /^(19|20)\d\d-(0[1-9]|1[012])-([012]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/i;
      if (timestampFrom && !regex.test(timestampFrom)) {
        throw new BadSyntaxException(
          "Query parameter dateFrom must be in the format yyyy-MM-ddTHH:mm:ss"
        );
      }
      if (timestampTo && !regex.test(timestampTo)) {
        throw new BadSyntaxException(
          "Query parameter dateTo must be in the format yyyy-MM-ddTHH:mm:ss"
        );
      }
      if (
        timestampFrom &&
        timestampTo &&
        Date.parse(timestampFrom) > Date.parse(timestampTo)
      ) {
        throw new BadSyntaxException(
          "Query parameter dateFrom must be set to a date before query parameter dateTo"
        );
      }
    }
    if (this._req.query["showParticipants"]) {
      const showParticipantsString: string = this._req.query["showParticipants"]
        .toString()
        .toLowerCase();
      if (
        showParticipantsString != "true" &&
        showParticipantsString != "false"
      ) {
        throw new BadSyntaxException(
          "Query parameter showParticipants must be either true or false."
        );
      }
    }
  }

  /**
   * Returns a list of raids after making a GET /raids request.
   * @returns A list of objects representing raids.
   */
  public async prepareResponse(
    paginated: {
      page: number;
      pageSize: number;
    } = { page: 1, pageSize: 100 }
  ): Promise<Object> {
    const documents = await DB.queryRaids(await this.dbFilter(), paginated);

    const idArray = new Array<string>();
    if (
      this._req.query["showParticipants"] &&
      this._req.query["showParticipants"].toString().toLowerCase() == "true"
    ) {
      documents.forEach((document) =>
        document.roles.forEach((role) => {
          role.participants.forEach((participant) => idArray.push(participant));
        })
      );
    }
    documents.forEach((document) => idArray.push(document.leaderId));

    // Resolve the IDs to names.
    const idMap: Map<string, string | undefined> = await Utils.idsToMap(
      idArray
    );

    let formattedDocuments: Object;
    if (
      this._req.query["format"] &&
      this._req.query["format"].toString().toLowerCase() == "csv"
    ) {
      formattedDocuments = documents.map((document) => {
        return `"${idMap.get(document.leaderId)}","${document.name}","${
          document.startTime.toISOString().split("T")[0]
        }","${document.startTime
          .toISOString()
          .split("T")[1]
          .replace(/:\d+\.\d+Z/, "")}","${document.compositionName}","${
          document._id
        }"`;
      });
    } else {
      formattedDocuments = {
        raids: documents.map((document) => {
          return {
            name: document.name,
            status: document.status,
            startTime: Utils.formatDatetimeString(document.startTime),
            endTime: Utils.formatDatetimeString(document.endTime),
            leader: idMap.get(document.leaderId),
            comp: document.compositionName,
            publishedDate: Utils.formatDatetimeString(document.publishedDate),
            ...(this._req.query["showParticipants"] &&
              this._req.query["showParticipants"].toString().toLowerCase() ===
                "true" && {
                participants: document.roles.flatMap((role) =>
                  role.participants.map((participant) => idMap.get(participant))
                ),
              }),
            id: document._id.toHexString(),
          };
        }),
        totalElements: await DB.queryRaidsCount(await this.dbFilter()),
      };
    }

    return formattedDocuments;
  }

  /**
   * Filters the documents according to the filters specified in the query parameters.
   * @throws {ResourceNotFoundException} When the Discord name of the specified leader cannot be found in the database.
   * @returns A filter to pass into the database query.
   */
  private async dbFilter(): Promise<Object> {
    const filters: Object[] = [];
    if (this._req.query["status"]) {
      const filterStatus: RegExp[] = Utils.getRegexListFromQueryString(
        this._req.query["status"].toString()
      );
      filters.push({ status: { $in: filterStatus } });
    }
    if (this._req.query["name"]) {
      const regex: RegExp = /[-!$%^&*()_+|~=`{}[\]:";'<>?,./\s]+/gi;
      const strippedName: string = this._req.query["name"]
        .toString()
        .replace(regex, "")
        .toLowerCase();
      const escapedName: string = escapeStringRegexp(strippedName);

      filters.push({
        name: { $regex: escapedName },
      });
    }
    if (this._req.query["comps"]) {
      const filterComps: RegExp[] = Utils.getRegexListFromQueryString(
        this._req.query["comps"].toString()
      );
      filters.push({ compositionName: { $in: filterComps } });
    }
    if (this._req.query["leader"]) {
      const document = await DB.queryMemberByName(
        this._req.query["leader"].toString()
      );
      if (document == undefined) {
        throw new ResourceNotFoundException(
          this._req.query["leader"].toString()
        );
      }
      filters.push({ leaderId: document.userId });
    }
    if (this._req.query["published"]) {
      const publishedString = this._req.query["published"]
        .toString()
        .toLowerCase();
      filters.push({ publishedDate: { $exists: publishedString == "true" } });
    }
    if (this._req.query["participants"]) {
      const filterParticipants: string[] = this._req.query["participants"]
        .toString()
        .split(",");
      const memberMap: Map<string | undefined, string> = await Utils.namesToMap(
        filterParticipants
      );
      filters.push({
        "roles.participants": { $all: Array.from(memberMap.values()) },
      });
    }
    if (this._req.query["reserves"]) {
      const filterParticipants: string[] = this._req.query["reserves"]
        .toString()
        .split(",");
      const memberMap: Map<string | undefined, string> = await Utils.namesToMap(
        filterParticipants
      );
      filters.push({
        "roles.reserves": { $all: Array.from(memberMap.values()) },
      });
    }
    if (this._req.query["dateFrom"]) {
      const fromDate: string = this._req.query["dateFrom"].toString();
      filters.push({
        startTime: {
          $gte: fromDate,
        },
      });
    }
    if (this._req.query["dateTo"]) {
      const toDate: string = this._req.query["dateTo"].toString();
      filters.push({
        startTime: {
          $lte: toDate,
        },
      });
    }

    return filters.length > 0 ? { $and: filters } : {};
  }
}

export class GetRaid extends HTTPGetRequest {
  public validRequestQueryParameters: string[] = ["names"];

  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, { authenticated: true });
  }

  /**
   * Perform specific validation for this endpoint.
   * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
   */
  public async validateRequest() {
    await super.validateRequest();

    if (this._req.query["names"]) {
      const nameString: string = this._req.query["names"]
        ?.toString()
        .toLowerCase();
      if (nameString != "discord" && nameString != "gw2") {
        throw new BadSyntaxException(
          "Query parameter names must be either discord or gw2."
        );
      }
    }
  }

  /**
   * Returns a raid after making a GET /raids/:id request.
   * @throws {ResourceNotFoundException} When the raid cannot be found.
   * @returns An object representing a raid.
   */
  public async prepareResponse(): Promise<Object> {
    const document = await DB.queryRaid(this._req.params["id"]);
    if (document == undefined) {
      throw new ResourceNotFoundException(this._req.params["id"]);
    }

    // Resolve the IDs to names.
    const idArray: string[] = [];
    document.roles.forEach((role) => {
      role.participants.forEach((participant) => idArray.push(participant));
      role.reserves.forEach((reserve) => idArray.push(reserve));
    });
    let idMap: Map<string, string | undefined>;
    if (
      this._req.query["names"] &&
      this._req.query["names"].toString().toLowerCase() == "gw2"
    ) {
      idMap = await Utils.idsToMap(idArray, { returnGW2Names: true });
    } else {
      idMap = await Utils.idsToMap(idArray);
    }
    const leaderDiscordName = (await Utils.idsToMap([document.leaderId])).get(
      document.leaderId
    );

    const formattedDocument = {
      name: document.name,
      description: document.description,
      status: document.status,
      startTime: Utils.formatDatetimeString(document.startTime),
      endTime: Utils.formatDatetimeString(document.endTime),
      leader: leaderDiscordName,
      comp: document.compositionName,
      publishedDate: Utils.formatDatetimeString(document.publishedDate),
      channelId: document.channelId,
      participants: document.roles.map((role) => {
        return {
          role: role.name,
          requiredParticipants: role.requiredParticipants,
          members: role.participants.map((participant) =>
            idMap.get(participant)
          ),
        };
      }),
      reserves: document.roles.map((role) => {
        return {
          role: role.name,
          members: role.reserves.map((reserve) => idMap.get(reserve)),
        };
      }),
      id: document._id.toHexString(),
    };

    return formattedDocument;
  }
}

export class GetRaidLog extends HTTPGetRequest {
  public validRequestQueryParameters: string[] = ["names"];

  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next);
  }

  /**
   * Perform specific validation for this endpoint.
   * @throws {BadSyntaxException} When the names query parameter exists and it's not a supported value.
   */
  public async validateRequest() {
    await super.validateRequest();

    if (this._req.query["names"]) {
      const nameString: string = this._req.query["names"]
        ?.toString()
        .toLowerCase();
      if (nameString != "discord" && nameString != "gw2") {
        throw new BadSyntaxException(
          "Query parameter names must be either discord or gw2."
        );
      }
    }
  }

  /**
   * Returns a raid log after making a GET /raids/:id.log request.
   * @throws {ResourceNotFoundException} When the raid cannot be found.
   * @returns An object representing a raid log.
   */
  public async prepareResponse(): Promise<Object> {
    const document = await DB.queryRaid(this._req.params["id"]);
    if (document == undefined) {
      throw new ResourceNotFoundException(this._req.params["id"]);
    }

    // Resolve the IDs to names.
    const idArray: string[] = [];
    document.log.forEach((log) => {
      idArray.push(log.data.user ? log.data.user : log.data);
    });
    let idMap: Map<string, string | undefined>;
    if (
      this._req.query["names"] &&
      this._req.query["names"].toString().toLowerCase() == "GW2"
    ) {
      idMap = await Utils.idsToMap(idArray, { returnGW2Names: true });
    } else {
      idMap = await Utils.idsToMap(idArray);
    }

    const formattedDocument = document.log.map((log) => {
      return {
        date: Utils.formatDatetimeString(log.date),
        type: log.type,
        data: {
          user: idMap.get(log.data.user ? log.data.user : log.data),
          roleName: log.data.roleName,
          isReserve: log.data.isReserve,
        },
      };
    });

    return formattedDocument;
  }
}
