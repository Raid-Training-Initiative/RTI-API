import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import { execSync } from "child_process";
import escapeStringRegexp = require("escape-string-regexp");
import { Request } from "express";
import { ObjectId } from "mongoose";
import DB from "./DB";
import { Logger, Severity } from "./Logger";

export default class Utils {
    /**
     * Maps discord IDs to discord or GW2 names.
     * @param ids A string array of discord IDs.
     * @param options An object containing a boolean specifying whether to return GW2 names (true) or discord names (false).
     * @returns A map with the keys being discord IDs and the values being discord or GW2 names.
     */
    public static async idsToMap(
        ids: string[],
        options?: { returnGW2Names: boolean },
    ): Promise<Map<string, string | undefined>> {
        const idMap = new Map<string, string | undefined>();
        const documents: IMemberDocument[] = await DB.queryMembers({
            userId: { $in: ids },
        });
        documents.forEach((document) =>
            idMap.set(
                document.userId,
                options?.returnGW2Names
                    ? document.gw2Name
                    : document.discordTag,
            ),
        );

        return idMap;
    }

    /**
     * Maps discord names to discord IDs.
     * @param names A string array of discord names.
     * @returns A map with the keys being discord names and the values being discord IDs.
     */
    public static async namesToMap(
        names: string[],
    ): Promise<Map<string | undefined, string>> {
        const idMap = new Map<string | undefined, string>();
        const documents: IMemberDocument[] = await DB.queryMembers({
            discordTag: { $in: names },
        });
        documents.forEach((document) =>
            idMap.set(document.discordTag, document.userId),
        );

        return idMap;
    }

    /**
     * Returns a map of IDs for all members matching the passed name.
     * @param name The discord name to query the database with.
     * @param options An object containing a boolean specifying whether to return GW2 names (true) or discord names (false).
     * @returns A map with the keys being discord IDs and the values being discord or GW2 names.
     */
    public static async matchesNameIdMap(
        name: string,
        options?: { returnGW2Names: boolean },
    ): Promise<Map<string, string | undefined>> {
        const idMap = new Map<string, string | undefined>();
        name = escapeStringRegexp(name);
        const regex: RegExp = new RegExp(name, "gi");
        const documents: IMemberDocument[] = await DB.queryMembers(
            options?.returnGW2Names
                ? { gw2Name: regex }
                : { discordTag: regex },
        );
        documents.forEach((document) =>
            idMap.set(
                document.userId,
                options?.returnGW2Names
                    ? document.gw2Name
                    : document.discordTag,
            ),
        );

        return idMap;
    }

    /**
     * Returns a map containing the database IDs for all categories passed in the parameter.
     * @param categories A list of strings representing the categories to get the database IDs of.
     * @returns A map with the keys being the lowercased category names and the values being the database IDs.
     */
    public static async getCategoryIdsMapFromCategories(
        categories: string[],
    ): Promise<Map<string, ObjectId>> {
        const idMap = new Map<string, ObjectId>();
        const categoriesRegex: RegExp[] = categories.map(
            (category) => new RegExp(category, "gi"),
        );
        const documents: IRaidCompositionCategoryDocument[] =
            await DB.queryCategories({ name: { $in: categoriesRegex } });
        documents.forEach((document) =>
            idMap.set(document.name.toLowerCase(), document._id),
        );

        return idMap;
    }

    /**
     * Returns a list of regex expressions for each query in string.
     * @param queryString A comma-separated string of elements. For example: chrono,druid,warrior.
     * @returns A list of regex expressions. For example: [/^chrono$/gi, /^druid$/gi, /^warrior$/gi].
     */
    public static getRegexListFromQueryString(queryString: string): RegExp[] {
        return queryString
            .split(",")
            .map((query) => new RegExp(`^${escapeStringRegexp(query)}$`, "gi"));
    }

    /**
     * Takes a date and time and formats it to a consistent datetime format (yyyy/MM/ddTHH:mm:ss).
     * @param date The date and time to format.
     * @returns The formatted datetime as a string.
     */
    public static formatDatetimeString(date: Date): string;
    public static formatDatetimeString(date: undefined): undefined;
    // please don't ask, this is required: https://stackoverflow.com/a/75891651
    public static formatDatetimeString(date?: Date): string | undefined;
    public static formatDatetimeString(date?: Date): string | undefined {
        return date?.toISOString().replace(/\.\d+Z/, "");
    }

    /**
     * Takes a date and time and formats it to a consistent date format (yyyy/MM/dd).
     * @param date The date and time to format.
     * @returns The formatted date as a string.
     */
    public static formatDateString(date: Date | undefined): string | undefined {
        return date?.toISOString().split("T")[0];
    }

    /**
     * Generates a string to use for a log specifying what filters were used.
     * @param validRequestQueryParameters A list of query parameter names to cycle through for the filter string/
     * @param req The request being made.
     * @returns A string to use to output to a log.
     */
    public static generateFilterString(
        validRequestQueryParameters: string[],
        req: Request,
    ): string {
        const filterString: string[] = [];
        validRequestQueryParameters.forEach((queryParam) => {
            if (req.query[queryParam]) {
                filterString.push(`${queryParam}: ${req.query[queryParam]}`);
            }
        });

        return filterString.join(" | ");
    }

    /**
     * Return the commit info (short hash + branch name) of the repository that is currently active.
     * @returns An object containing branch and commitId as strings with git info.
     */
    public static getCommitInfo(): Object | undefined {
        if (process.env.COMMIT_ID && process.env.BRANCH) {
            // If the environment variables were set (running on Docker).
            return {
                branch: process.env.BRANCH.trim(),
                commitId: process.env.COMMIT_ID.trim(),
            };
        } else {
            // Probably running on Node.
            const branchNameCommand = "git rev-parse --abbrev-ref HEAD";
            const commitHashCommand = "git rev-parse --short HEAD";
            let commitInfo: Object | undefined;
            try {
                commitInfo = {
                    branch: execSync(branchNameCommand).toString().trim(),
                    commitId: execSync(commitHashCommand).toString().trim(),
                };
            } catch (exception) {
                Logger.logError(Severity.Error, exception.message);
            }

            return commitInfo;
        }
    }
}

export type PaginatedResponse<T, PropertyName extends string> = {
    totalElements: number;
} & { [P in PropertyName]: T[] };
