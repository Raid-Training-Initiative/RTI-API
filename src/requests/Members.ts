/**
 * File for classes that handle requests for compositions.
 */

import { NextFunction, Request, Response } from "express";
import ResourceNotFoundException from "../exceptions/ResourceNotFoundException";
import DB from "../util/DB";
import Utils, { PaginatedResponse } from "../util/Utils";
import BadSyntaxException from "../exceptions/BadSyntaxException";
import HTTPGetRequest from "./base/HTTPGetRequest";
import { MemberDto } from "src/requests/dto/member.dto";
import { FilterQuery } from "mongoose";
import { IMemberModel } from "@RTIBot-DB/schemas/MemberSchema";
import { IAccountModel } from "../../RTIBot-DB/schemas/AccountSchema";

export class ListMembers extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [
        "gw2Name",
        "discordTag",
        "approver",
        "banned",
        "format",
        "page",
        "pageSize",
    ];

    private filterBanned?: boolean;

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, {
            paginated: true,
            multiFormat: true,
            authenticated: true,
        });
    }

    /**
     * Validates the request with the basic HTTP request validation and then checks if the query parameters are correct.
     * @throws {BadSyntaxException} When a query parameter doesn't have the correct value.
     */
    public async validateRequest() {
        await super.validateRequest();

        if (this._req.query["banned"]) {
            const bannedString: string = this._req.query["banned"]
                .toString()
                .toLowerCase();
            if (bannedString != "true" && bannedString != "false") {
                throw new BadSyntaxException(
                    "Query parameter banned must be either true or false.",
                );
            }

            this.filterBanned = bannedString === "true";
        }
    }

    /**
     * Returns a list of members after making a GET /members request.
     * @returns A list of objects representing members.
     */
    public async prepareResponse(
        pagination: {
            page: number;
            pageSize: number;
        } = { page: 1, pageSize: 100 },
    ): Promise<PaginatedResponse<MemberDto, "members"> | string[]> {
        const documents = await DB.queryMembers(
            await this.memberDbFilter(),
            await this.accountDbFilter(),
            pagination,
        );

        // Resolve the IDs to names.
        const idArray = new Array<string>();
        documents.forEach((document) => idArray.push(document.approverId));
        const idMap: Map<string, string | undefined> =
            await Utils.idsToMap(idArray);

        if (this.responseFormat == "csv") {
            return documents.map((document) => {
                return `"${idMap.get(document.approverId)}","${document.account.gw2Name}","${
                    document.account.discordTag
                }","${document._id}"`;
            });
        }

        return {
            totalElements: await DB.queryMembersCount(
                await this.memberDbFilter(),
                await this.accountDbFilter(),
            ),
            members: documents.map((document) => {
                return MemberDto.fromDocument(document, idMap);
            }),
        };
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @throws {ResourceNotFoundException} When the approver is not found.
     * @returns A member filter to pass into the database query.
     */
    private async memberDbFilter(): Promise<FilterQuery<IMemberModel>> {
        const filters: Record<string, unknown>[] = [];
        if (this._req.query["approver"]) {
            const document = await DB.queryMemberByName(
                this._req.query["approver"].toString(),
            );
            if (document == undefined) {
                throw new ResourceNotFoundException(
                    this._req.query["approver"].toString(),
                );
            }
            filters.push({ approverId: document.account.userId });
        }
        if (this.filterBanned !== undefined) {
            filters.push({ banned: this.filterBanned });
        }

        return filters.length > 0 ? { $or: filters } : {};
    }

    /**
     * Filters the documents according to the filters specified in the query parameters.
     * @returns An account filter to pass into the database query.
     */
    private async accountDbFilter(): Promise<FilterQuery<IAccountModel>> {
        const filters: Record<string, unknown>[] = [];
        if (this._req.query["gw2Name"]) {
            const idMap = await Utils.matchesNameIdMap(
                this._req.query["gw2Name"].toString(),
                { returnGW2Names: true },
            );
            filters.push({ userId: { $in: Array.from(idMap.keys()) } });
        }
        if (this._req.query["discordTag"]) {
            const idMap = await Utils.matchesNameIdMap(
                this._req.query["discordTag"].toString(),
                { returnGW2Names: false },
            );
            filters.push({ userId: { $in: Array.from(idMap.keys()) } });
        }

        return filters.length > 0 ? { $or: filters } : {};
    }
}

export class GetMember extends HTTPGetRequest {
    public validRequestQueryParameters: string[] = [];

    constructor(req: Request, res: Response, next: NextFunction) {
        super(req, res, next, { authenticated: true });
    }

    /**
     * Returns the JSON string payload of a comp after making a GET /members/:member request.
     * @throws {ResourceNotFoundException} When the comp cannot be found.
     * @returns An object representing a member.
     */
    public async prepareResponse(): Promise<MemberDto> {
        const document = await DB.queryMemberById(this._req.params["userid"]);
        if (document == undefined) {
            throw new ResourceNotFoundException(this._req.params["userid"]);
        }

        const approverDiscordName = await Utils.idsToMap([document.approverId]);
        return MemberDto.fromDocument(document, approverDiscordName);
    }
}
