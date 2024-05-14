import { IGuildOptionsData } from "@RTIBot-DB/documents/IGuildOptionsDocument";
import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import {
    IRaidCompositionDocument,
    IRaidCompositionPopulatedDocument,
    IRaidCompositionRole,
} from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { IRaidEventDocument } from "@RTIBot-DB/documents/IRaidEventDocument";
import { ITrainingRequestDocument } from "@RTIBot-DB/documents/ITrainingRequestDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import {
    ITrainingRequestModel,
    TrainingRequestSchema,
} from "@RTIBot-DB/schemas/TrainingRequestSchema";
import { FilterQuery, ObjectId } from "mongoose";
import ServerErrorException from "../exceptions/ServerErrorException";
import { IConfig } from "./Config";
import { IRaidCompositionModel } from "@RTIBot-DB/schemas/RaidCompositionSchema";
import { IMemberModel } from "@RTIBot-DB/schemas/MemberSchema";
import { IRaidEventModel } from "@RTIBot-DB/schemas/RaidEventSchema";
import { IRaidCompositionCategoryModel } from "@RTIBot-DB/schemas/RaidCompositionCategorySchema";

export default class DB {
    private static _instance: DB;
    private _db: MongoDatabase;

    private constructor(config: IConfig) {
        this._db = new MongoDatabase(config.db, config.guildId);
    }

    /**
     * Creates an instance of this class if it does not exist already, connects to the database, and creates the indexes.
     * @param config The configuration which includes the database details.
     * @throws {ServerErrorException} When this method is called after the instance is already created.
     */
    public static async create(config: IConfig) {
        if (!this._instance) {
            this._instance = new this(config);
            await this._instance._db.connect();

            // Create the indexes required for database queries.
            TrainingRequestSchema.index({ comment: "text" });
            this._instance._db.trainingRequestModel.createIndexes();
        } else {
            throw new ServerErrorException(
                "Attempted to create existing database instance.",
            );
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
            throw new ServerErrorException(
                "DB instance not properly initialised.",
            );
        }
    }

    /**
     * Queries the database and retrieves a list of comps.
     * @param filter An object to pass into the database query that filters the results.
     * @returns A list of comps.
     */
    public static async queryComps(
        filter?: FilterQuery<IRaidCompositionModel>,
    ): Promise<IRaidCompositionPopulatedDocument[]> {
        return (await this._instance._db.raidCompositionModel
            .find(filter ? filter : {})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument[];
    }

    /**
     * Queries the database and retrieves a comp by its name.
     * @param compName The name of the comp.
     * @returns A single comp.
     */
    public static async queryComp(
        compName: string,
    ): Promise<IRaidCompositionPopulatedDocument> {
        return (await this._instance._db.raidCompositionModel
            .findOne({ name: compName })
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument;
    }

    /**
     * Queries the database and retrieves the count of comps.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of comps.
     */
    public static async queryCompsCount(
        filter?: FilterQuery<IRaidCompositionModel>,
    ): Promise<number> {
        return (await this._instance._db.raidCompositionModel
            .countDocuments(filter ? filter : {})
            .exec()) as number;
    }

    /**
     * Creates a comp in the database.
     * @param name The name of the comp.
     * @param roles A list of roles (with each role having a name and requiredParticipants).
     * @param categories A list of ObjectIds linking to categories.
     * @returns The comp that was created.
     */
    public static async createComp(
        name: string,
        roles: IRaidCompositionRole[],
        categories: ObjectId[],
    ): Promise<IRaidCompositionDocument> {
        return await this._instance._db.raidCompositionModel.create({
            name: name,
            roles: roles,
            categories: categories,
        });
    }

    /**
     * Deletes a comp in the database.
     * @param compName The name of the comp.
     * @returns A boolean that is true if the comp was deleted and false otherwise.
     */
    public static async deleteComp(compName: string): Promise<boolean> {
        return (
            (
                await this._instance._db.raidCompositionModel.deleteOne({
                    name: compName,
                })
            ).deletedCount == 1
        );
    }

    /**
     * Adds a category for a comp in the database.
     * @param compName The name of the comp to add the cateogry to.
     * @param categoryId The ObjectId for the category to add.
     */
    public static async addCategoryToComp(
        compName: string,
        categoryId: ObjectId,
    ): Promise<void> {
        const document = await this.queryComp(compName);
        document.categories.addToSet(categoryId);
        await document.save();
    }

    /**
     * Queries the database and retrieves a list of categories.
     * @param filter An object to pass into the database query that filters the results.
     * @returns A list of categories.
     */
    public static async queryCategories(
        filter?: FilterQuery<IRaidCompositionCategoryModel>,
    ): Promise<IRaidCompositionCategoryDocument[]> {
        return (await this._instance._db.raidCompositionCategoryModel
            .find(filter ? filter : {})
            .exec()) as IRaidCompositionCategoryDocument[];
    }

    /**
     * Queries the database and retrieves a category by its name.
     * @param categoryName The name of the category.
     * @returns A single category.
     */
    public static async queryCategory(
        categoryName: string,
    ): Promise<IRaidCompositionCategoryDocument> {
        return (await this._instance._db.raidCompositionCategoryModel
            .findOne({ name: categoryName })
            .exec()) as IRaidCompositionCategoryDocument;
    }

    /**
     * Queries the database and retrieves the count of categories.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of categories.
     */
    public static async queryCategoriesCount(
        filter?: FilterQuery<IRaidCompositionCategoryModel>,
    ): Promise<number> {
        return (await this._instance._db.raidCompositionCategoryModel
            .count(filter ? filter : {})
            .exec()) as number;
    }

    /**
     * Creates a category in the database.
     * @param name The name of the category.
     * @returns The category that was created.
     */
    public static async createCategory(
        name: string,
    ): Promise<IRaidCompositionCategoryDocument> {
        return await this._instance._db.raidCompositionCategoryModel.create({
            name: name,
        });
    }

    /**
     * Queries the database and retrieves a list of raids.
     * @param filter An object to pass into the database query that filters the results.
     * @param pagination Settings for paginating the result.
     * @returns A list of raids.
     */
    public static async queryRaids(
        filter?: FilterQuery<IRaidEventModel>,
        pagination?: { page: number; pageSize: number },
    ): Promise<IRaidEventDocument[]> {
        if (pagination) {
            return (await this._instance._db.raidEventModel
                .find(filter ? filter : {})
                .sort({ _id: -1 })
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as IRaidEventDocument[];
        } else {
            return (await this._instance._db.raidEventModel
                .find(filter ? filter : {})
                .sort({ _id: -1 })
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
            .findOne({ _id: raidId })
            .exec()) as IRaidEventDocument;
    }

    /**
     * Queries the database and retrieves the count of raids.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of raids.
     */
    public static async queryRaidsCount(
        filter?: FilterQuery<IRaidEventModel>,
    ): Promise<number> {
        return (await this._instance._db.raidEventModel
            .countDocuments(filter ? filter : {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves a list of members.
     * @param filter An object to pass into the database query that filters the results.
     * @param pagination Settings for paginating the result.
     * @returns A list of members.
     */
    public static async queryMembers(
        filter?: FilterQuery<IMemberModel>,
        pagination?: { page: number; pageSize: number },
    ): Promise<IMemberDocument[]> {
        if (pagination) {
            return (await this._instance._db.memberModel
                .find(filter ? filter : {})
                .sort({ _id: -1 })
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as IMemberDocument[];
        } else {
            return (await this._instance._db.memberModel
                .find(filter ? filter : {})
                .sort({ _id: -1 })
                .exec()) as IMemberDocument[];
        }
    }

    /**
     * Queries the database and retrieves member by its discord ID.
     * @param discordId The discord ID of the member.
     * @returns A single member.
     */
    public static async queryMemberById(
        discordId?: string,
    ): Promise<IMemberDocument> {
        return (await this._instance._db.memberModel
            .findOne({ userId: discordId })
            .exec()) as IMemberDocument;
    }

    /**
     * Queries the database and retrieves member by its discord ID with populated reference fields.
     * @param discordId The discord ID of the member.
     * @returns A single populated member.
     */
    public static async queryMemberPopulatedById(
        discordId?: string,
    ): Promise<IMemberDocument> {
        return (await this._instance._db.memberModel
            .findOne({ userId: discordId })
            .populate("roles")
            .exec()) as IMemberDocument;
    }

    /**
     * Queries the database and retrieves member by its name.
     * @param name The name of the member, either a GW2 name or a discord name.
     * @param options Whether to use GW2 names or discord names.
     * @returns A single member.
     */
    public static async queryMemberByName(
        name?: string,
        options?: { useGW2Name: boolean },
    ): Promise<IMemberDocument> {
        if (options?.useGW2Name) {
            return (await this._instance._db.memberModel
                .findOne({ gw2Name: name })
                .exec()) as IMemberDocument;
        } else {
            return (await this._instance._db.memberModel
                .findOne({ discordTag: name })
                .exec()) as IMemberDocument;
        }
    }

    /**
     * Queries the database and retrieves the count of members.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of members.
     */
    public static async queryMembersCount(
        filter?: FilterQuery<IMemberModel>,
    ): Promise<number> {
        return (await this._instance._db.memberModel
            .countDocuments(filter ? filter : {})
            .exec()) as number;
    }

    /**
     * Queries the database and retrieves a list of training requests.
     * @param filter An object to pass into the database query that filters the results.
     * @returns A list of training requests.
     */
    public static async queryTrainingRequests(
        filter?: FilterQuery<ITrainingRequestModel>,
        pagination?: { page: number; pageSize: number },
    ): Promise<ITrainingRequestDocument[]> {
        if (pagination) {
            return (await this._instance._db.trainingRequestModel
                .find(filter ? filter : {})
                .sort({ _id: -1 })
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as ITrainingRequestDocument[];
        } else {
            return (await this._instance._db.trainingRequestModel
                .find(filter ? filter : {})
                .sort({ _id: -1 })
                .exec()) as ITrainingRequestDocument[];
        }
    }

    /**
     * Queries the database and retrieves member by the user ID of the member who performed the training request.
     * @param userId The user ID of the member who performed the training request.
     * @returns A single training request.
     */
    public static async queryTrainingRequest(
        userId: string,
    ): Promise<ITrainingRequestDocument> {
        return (await this._instance._db.trainingRequestModel
            .findOne({ userId: userId })
            .exec()) as ITrainingRequestDocument;
    }

    /**
     * Queries the database and retrieves the count of training requests.
     * @param filter An object to pass into the database query that filters the results.
     * @returns The count of training requests.
     */
    public static async queryTrainingRequestsCount(
        filter?: FilterQuery<ITrainingRequestModel>,
    ): Promise<number> {
        return (await this._instance._db.trainingRequestModel
            .countDocuments(filter ? filter : {})
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
