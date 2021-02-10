import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import escapeStringRegexp = require("escape-string-regexp");
import DB from "./DB";

export default class Utils {
    /**
     * Maps discord IDs to GW2 names.
     * @param ids A string array of discord IDs.
     * @param returnGW2Names A boolean specifying whether to return GW2 names (true) or discord names (false).
     * @returns A map with the keys being discord IDs and the values being discord or GW2 names.
     */
    public static async getMemberIdMap(ids: string[], returnGW2Names?: boolean): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        const documents: IMemberDocument[] = await DB.queryMembers({userId: {$in: ids}});
        documents.forEach(document => idMap.set(document.userId, returnGW2Names ? document.gw2Name : document.gw2Name));

        return idMap;
    }

    /**
     * Returns a map for all members matching the passed name.
     * @param name The discord name to query the database with.
     * @param returnGW2Names A boolean specifying whether to return GW2 names (true) or discord names (false).
     * @returns A map with the keys being discord IDs and the values being discord or GW2 names.
     */
    public static async matchesNameIdMap(name: string, returnGW2Names?: boolean, fuzzyMatch?: boolean): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        let escapedName = escapeStringRegexp(name);
        if (fuzzyMatch) escapedName = escapedName.replace(/[#.]\d{4}/gi, "");
        const regex: RegExp = new RegExp(escapedName, "gi");
        const documents: IMemberDocument[] = await DB.queryMembers({gw2Name: regex});
        documents.forEach(document => idMap.set(document.userId, returnGW2Names ? document.gw2Name : document.gw2Name));

        return idMap;
    }

    /**
     * Returns a map containing the database IDs for all categories passed in the parameter.
     * @param categories A list of strings representing the categories to get the database IDs of.
     * @returns A map with the keys being the lowercased category names and the values being the database IDs.
     */
    public static async getCategoryIdsMapFromCategories(categories: string[]): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        const categoriesRegex: RegExp[] = categories.map(category => new RegExp(category, "gi"));
        const documents: IRaidCompositionCategoryDocument[] = await DB.queryCategories({name: {$in: categoriesRegex}});
        documents.forEach(document => idMap.set(document.name.toLowerCase(), document._id.toHexString()));
        
        return idMap;
    }

    /**
     * Takes a date and formats it to a consistent format (yyyy/MM/ddTHH:mm:ss).
     * @param date The date to format.
     * @returns The formatted date as a string.
     */
    public static formatDateString(date: Date | undefined): string | undefined {
        return date?.toISOString().replace(/\.\d+Z/, "");
    }
}