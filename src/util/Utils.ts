import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";

export default class Utils {
    /**
     * Returns a GW2 name from a discord ID.
     * @param id A string of a discord ID.
     * @param db The database.
     */
    public static async getGW2NameFromId(id: string, db: MongoDatabase): Promise<string> {
        const document = (await db.memberModel.findOne({userId: id}).exec()) as IMemberDocument;
        return document.gw2Name;
    }

    /**
     * Returns a discord name from a discord ID.
     * @param ids A string array of discord IDs.
     * @param db The database.
     */
    public static async getDiscordNameFromId(id: string, db: MongoDatabase): Promise<string> {
        const document = (await db.memberModel.findOne({userId: id}).exec()) as IMemberDocument;
        return document.gw2Name;
    }

    /**
     * Returns a list of GW2 names resolved from discord IDs.
     * @param ids A string array of discord IDs.
     * @param db The database.
     * @returns An array of objects with a name and id value.
     */
    public static async getGW2NamesFromIds(ids: string[], db: MongoDatabase): Promise<Object[]> {
        const documents = (await db.memberModel.find({userId: {$in: ids}}).exec()) as IMemberDocument[];
        return documents.map(document => { return { name: document.gw2Name, id: document.userId }} );
    }

    /**
     * Returns a list of discord names resolved from discord IDs.
     * @param ids A string array of discord IDs.
     * @param db The database.
     * @returns An array of objects with a name and id value.
     */
    public static async getDiscordNamesFromIds(ids: string[], db: MongoDatabase): Promise<Object[]> {
        const documents = (await db.memberModel.find({userId: {$in: ids}}).exec()) as IMemberDocument[];
        return documents.map(document => { return { name: document.gw2Name, id: document.userId }} );
    }

    /**
     * Maps discord IDs to GW2 names.
     * @param ids A string array of discord IDs.
     * @param db The database.
     * @returns A map with the keys being discord IDs and the values being GW2 names.
     */
    public static async getGW2IdMap(ids: string[], db: MongoDatabase): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        const idNames = await this.getGW2NamesFromIds(ids, db);
        idNames.forEach(idName => idMap.set(idName["id"], idName["name"]));

        return idMap;
    }

    /**
     * Maps discord IDs to discord names.
     * @param ids A string array of discord IDs.
     * @param db The database.
     * @returns A map with the keys being discord IDs and the values being discord names.
     */
    public static async getDiscordIdMap(ids: string[], db: MongoDatabase): Promise<Map<string, string>> {
        const idMap = new Map<string, string>();
        const idNames = await this.getDiscordNamesFromIds(ids, db);
        idNames.forEach(idName => idMap.set(idName["id"], idName["name"]));

        return idMap;
    }
}