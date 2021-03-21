import { IGuildOptionsData } from "@RTIBot-DB/documents/IGuildOptionsDocument";
import { IMemberDocument, IMemberPopulatedDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { IRaidEventDocument } from "@RTIBot-DB/documents/IRaidEventDocument";
import { ITrainingRequestDocument } from "@RTIBot-DB/documents/ITrainingRequestDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import { TrainingRequestSchema } from "@RTIBot-DB/schemas/TrainingRequestSchema";
import ServerErrorException from "../exceptions/ServerErrorException";
import { IConfig } from "./Config";

export default class DB {
    private static _instance: DB;
    private _db: MongoDatabase;

    private constructor(config: IConfig) {
        this._db = new MongoDatabase(config.db, config.guildId)
    }

    /**
     * Creates an instance of this class if it does not exist already, connects to the database, and creates the indexes.
     * @param config The configuration which includes the database details.
     * @throws {ServerErrorException} When this method is called after the instance is already created.
     */
    public static async create(config: IConfig) {
        if (!this._instance) {
            this._instance = new this(config)
            await this._instance._db.connect();

            // Create the indexes required for database queries.
            TrainingRequestSchema.index({comment: "text"});
            this._instance._db.trainingRequestModel.createIndexes();
        } else {
            throw new ServerErrorException("Attempted to create existing database instance.");
        }
    }

    /**
     * Method to retrieve the instance of this class.
     * @returns The DB instance that has already been created.
     */
    public static instance(): DB {
        if (this._instance) {
            return this._instance;
        } else {
            throw new ServerErrorException("DB instance not properly initialised.");
        }
    }

    /**
     * Queries the database and retrieves a list of comps.
     * @param filter An object to pass into the database query that filters the results.
     * @returns A list of comps.
     */
    public static async queryComps(filter?: Object): Promise<IRaidCompositionPopulatedDocument[]> {
        return (await this._instance._db.raidCompositionModel
            .find(filter ? filter: {})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument[];
    }

    /**
     * Queries the database and retrieves a comp by its name.
     * @param compName The name of the comp.
     * @returns A single comp.
     */
    public static async queryComp(compName: string): Promise<IRaidCompositionPopulatedDocument> {
        return (await this._instance._db.raidCompositionModel
            .findOne({name: compName})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument;
    }

    /**
     * Queries the database and retrieves the count of comps.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of comps.
     */
    public static async queryCompsCount(filter?: Object): Promise<number> {
        return (await this._instance._db.raidCompositionModel
            .count(filter ? filter: {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves a list of categories.
     * @param filter An object to pass into the database query that filters the results.
     * @returns A list of categories.
     */
    public static async queryCategories(filter?: Object): Promise<IRaidCompositionCategoryDocument[]> {
        return (await this._instance._db.raidCompositionCategoryModel
            .find(filter ? filter : {})
            .exec()) as IRaidCompositionCategoryDocument[];
    }

    /**
     * Queries the database and retrieves a category by its name.
     * @param categoryName The name of the category.
     * @returns A single category.
     */
    public static async queryCategory(categoryName: string): Promise<IRaidCompositionCategoryDocument> {
        return (await this._instance._db.raidCompositionCategoryModel
            .findOne({name: categoryName})
            .exec()) as IRaidCompositionCategoryDocument;
    }

    /**
     * Queries the database and retrieves the count of categories.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of categories.
     */
    public static async queryCategoriesCount(filter?: Object): Promise<number> {
        return (await this._instance._db.raidCompositionCategoryModel
            .count(filter ? filter: {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves a list of raids.
     * @param filter An object to pass into the database query that filters the results.
     * @param pagination Settings for paginating the result.
     * @returns A list of raids.
     */
    public static async queryRaids(filter?: Object, pagination?: {page: number, pageSize: number}): Promise<IRaidEventDocument[]> {
        if (pagination) {
            return (await this._instance._db.raidEventModel
                .find(filter ? filter : {})
                .sort({startTime: -1, _id: 1})
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as IRaidEventDocument[];
        } else {
            return (await this._instance._db.raidEventModel
                .find(filter ? filter : {})
                .sort({startTime: -1, _id: 1})
                .exec()) as IRaidEventDocument[];
        }
    }

    /**
     * Queries the database and retrieves a raid by its ID.
     * @param raidId The internal database ID of the raid.
     * @returns A single raid.
     */
    public static async queryRaid(raidId: string): Promise<IRaidEventDocument> {
        return (await this._instance._db.raidEventModel
            .findOne({_id: raidId})
            .exec()) as IRaidEventDocument;
    }

    /**
     * Queries the database and retrieves the count of raids.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of raids.
     */
    public static async queryRaidsCount(filter?: Object): Promise<number> {
        return (await this._instance._db.raidEventModel
            .count(filter ? filter: {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves a list of members.
     * @param filter An object to pass into the database query that filters the results.
     * @param pagination Settings for paginating the result.
     * @returns A list of members.
     */
    public static async queryMembers(filter?: Object, pagination?: {page: number, pageSize: number}): Promise<IMemberDocument[]> {
        if (pagination) {
            return (await this._instance._db.memberModel
                .find(filter ? filter : {})
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as IMemberDocument[];
        } else {
            return (await this._instance._db.memberModel
                .find(filter ? filter : {})
                .exec()) as IMemberDocument[];
        }
    }

    /**
     * Queries the database and retrieves member by its discord ID.
     * @param discordId The discord ID of the member.
     * @returns A single member.
     */
    public static async queryMemberById(discordId?: string): Promise<IMemberDocument> {
        return (await this._instance._db.memberModel
            .findOne({userId: discordId})
            .exec()) as IMemberDocument;
    }

    /**
     * Queries the database and retrieves member by its discord ID, populated reference fields
     * @param discordId The discord ID of the member.
     * @returns A single member.
     */
    public static async query_member_populated_by_id(discordId?: string): Promise<IMemberPopulatedDocument> {
        return (await this._instance._db.memberModel
            .findOne({userId: discordId})
            .populate("roles")
            .exec()) as IMemberPopulatedDocument;
    }

     /**
     * Queries the database and retrieves member by its name.
     * @param name The name of the member, either a GW2 name or a discord name.
     * @param options Whether to use GW2 names or discord names.
     * @returns A single member.
     */
    public static async queryMemberByName(name?: string, options?: {useGW2Name: boolean}): Promise<IMemberDocument> {
        if (options?.useGW2Name) {
            return (await this._instance._db.memberModel
                .findOne({gw2Name: name})
                .exec()) as IMemberDocument;
        } else {
            return (await this._instance._db.memberModel
                .findOne({discordTag: name})
                .exec()) as IMemberDocument;
        }
    }

    /**
     * Queries the database and retrieves the count of members.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of members.
     */
    public static async queryMembersCount(filter?: Object): Promise<number> {
        return (await this._instance._db.memberModel
            .count(filter ? filter: {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves a list of training requests.
     * @param filter An object to pass into the database query that filters the results.
     * @returns A list of training requests.
     */
    public static async queryTrainingRequests(filter?: Object, pagination?: {page: number, pageSize: number}): Promise<ITrainingRequestDocument[]> {
        if (pagination) {
            return (await this._instance._db.trainingRequestModel
                .find(filter ? filter : {})
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as ITrainingRequestDocument[];
        } else {
            return (await this._instance._db.trainingRequestModel
                .find(filter ? filter : {})
                .exec()) as ITrainingRequestDocument[];
        }
    }

     /**
     * Queries the database and retrieves member by the user ID of the member who performed the training request.
     * @param userId The user ID of the member who performed the training request.
     * @returns A single training request.
     */
    public static async queryTrainingRequest(userId: string): Promise<ITrainingRequestDocument> {
        return (await this._instance._db.trainingRequestModel
            .findOne({userId: userId})
            .exec()) as ITrainingRequestDocument;
    }

    /**
     * Queries the database and retrieves the count of training requests.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of training requests.
     */
    public static async queryTrainingRequestsCount(filter?: Object): Promise<number> {
        return (await this._instance._db.trainingRequestModel
            .count(filter ? filter: {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves the guild options.
     * @returns An object representing the guild options.
     */
    public static async queryGuildOptions(): Promise<IGuildOptionsData> {
        return (await this._instance._db.guildOptionsModel
            .findOne()
            .exec()) as IGuildOptionsData;
    }
}