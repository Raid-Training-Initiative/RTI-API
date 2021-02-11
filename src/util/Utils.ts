import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import escapeStringRegexp = require("escape-string-regexp");
import { Request } from "express";
import DB from "./DB";

export default class Utils {
    /**
     * Maps discord IDs to GW2 names.
     * @param ids A string array of discord IDs.
     * @param returnGW2Names A boolean specifying whether to return GW2 names (true) or discord names (false).
     * @returns A map with the keys being discord IDs and the values being discord or GW2 names.
     */
    public static async get_member_id_map(ids: string[], options?: {returnGW2Names: boolean}): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        const documents: IMemberDocument[] = await DB.query_members({userId: {$in: ids}});
        documents.forEach(document => idMap.set(document.userId, options?. returnGW2Names ? document.gw2Name : document.gw2Name));

        return idMap;
    }

    /**
     * Returns a map for all members matching the passed name.
     * @param name The discord name to query the database with.
     * @param returnGW2Names A boolean specifying whether to return GW2 names (true) or discord names (false).
     * @returns A map with the keys being discord IDs and the values being discord or GW2 names.
     */
    public static async matches_name_id_map(name: string, options?: {returnGW2Names: boolean}): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        name = escapeStringRegexp(name);
        const regex: RegExp = new RegExp(name, "gi");
        const documents: IMemberDocument[] = await DB.query_members({gw2Name: regex});
        documents.forEach(document => idMap.set(document.userId, options?.returnGW2Names ? document.gw2Name : document.gw2Name));

        return idMap;
    }

    /**
     * Returns a map containing the database IDs for all categories passed in the parameter.
     * @param categories A list of strings representing the categories to get the database IDs of.
     * @returns A map with the keys being the lowercased category names and the values being the database IDs.
     */
    public static async get_category_ids_map_from_categories(categories: string[]): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        const categoriesRegex: RegExp[] = categories.map(category => new RegExp(category, "gi"));
        const documents: IRaidCompositionCategoryDocument[] = await DB.query_categories({name: {$in: categoriesRegex}});
        documents.forEach(document => idMap.set(document.name.toLowerCase(), document._id.toHexString()));
        
        return idMap;
    }

    /**
     * Takes a date and formats it to a consistent format (yyyy/MM/ddTHH:mm:ss).
     * @param date The date to format.
     * @returns The formatted date as a string.
     */
    public static format_date_string(date: Date | undefined): string | undefined {
        return date?.toISOString().replace(/\.\d+Z/, "");
    }

    /**
     * Generates a string to use for a log specifying what filters were used.
     * @param validRequestQueryParameters A list of query parameter names to cycle through for the filter string/
     * @param req The request being made.
     * @returns A string to use to output to a log.
     */
    public static generate_filter_string(validRequestQueryParameters: string[], req: Request): string {
        let filterString: string = "";
        validRequestQueryParameters.forEach(queryParam => {
            if (req.query[queryParam]) {
                filterString += `${queryParam}: ${req.query[queryParam]} | `;
            }
        });

        return filterString;
    }
}