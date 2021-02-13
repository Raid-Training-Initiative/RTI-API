import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { IRaidEventDocument } from "@RTIBot-DB/documents/IRaidEventDocument";
import { ITrainingRequestDocument } from "@RTIBot-DB/documents/ITrainingRequestDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";
import ServerErrorException from "../exceptions/ServerErrorException";
import { IConfig } from "./Config";

export default class DB {
    private static _instance: DB;
    private db: MongoDatabase;

    private constructor(private readonly _config: IConfig) {
        this.db = new MongoDatabase(this._config.db, this._config.guildId)
    }

    public static async create(config: IConfig) {
        if (!this._instance) {
            this._instance = new this(config)
            await this._instance.db.connect();
        } else {
            throw new ServerErrorException("Error establishing connection to database.");
        }
    }

    public static instance(): DB {
        if (this._instance) {
            return this._instance;
        } else {
            throw new ServerErrorException("DB instance not properly initialised.");
        }
    }

    public static async query_comps(filter?: Object): Promise<IRaidCompositionPopulatedDocument[]> {
        return (await this._instance.db.raidCompositionModel
            .find(filter ? filter: {})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument[];
    }

    public static async query_comp(compName: string): Promise<IRaidCompositionPopulatedDocument> {
        return (await this._instance.db.raidCompositionModel
            .findOne({name: compName})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument;
    }

    public static async query_categories(filter?: Object): Promise<IRaidCompositionCategoryDocument[]> {
        return (await this._instance.db.raidCompositionCategoryModel
            .find(filter ? filter : {})
            .exec()) as IRaidCompositionCategoryDocument[];
    }

    public static async query_category(categoryName: string): Promise<IRaidCompositionCategoryDocument> {
        return (await this._instance.db.raidCompositionCategoryModel
            .findOne({name: categoryName})
            .exec()) as IRaidCompositionCategoryDocument;
    }

    public static async query_raids(filter?: Object, pagination?: {page: number, pageSize: number}): Promise<IRaidEventDocument[]> {
        if (pagination) {
            return (await this._instance.db.raidEventModel
                .find(filter ? filter : {})
                .sort({startTime: -1, _id: 1})
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as IRaidEventDocument[];
        } else {
            return (await this._instance.db.raidEventModel
                .find(filter ? filter : {})
                .sort({startTime: -1, _id: 1})
                .exec()) as IRaidEventDocument[];
        }
    }

    public static async query_raid(raidId: string): Promise<IRaidEventDocument> {
        return (await this._instance.db.raidEventModel
            .findOne({_id: raidId})
            .exec()) as IRaidEventDocument;
    }

    public static async query_members(filter?: Object, pagination?: {page: number, pageSize: number}): Promise<IMemberDocument[]> {
        if (pagination) {
            return (await this._instance.db.memberModel
                .find(filter ? filter : {})
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as IMemberDocument[];
        } else {
            return (await this._instance.db.memberModel
                .find(filter ? filter : {})
                .exec()) as IMemberDocument[];
        }
    }

    public static async query_member_by_id(discordId?: string): Promise<IMemberDocument> {
        return (await this._instance.db.memberModel
            .findOne({userId: discordId})
            .exec()) as IMemberDocument;
    }

    public static async query_member_by_name(name?: string, options?: {useGW2Name: boolean}): Promise<IMemberDocument> {
        if (options?.useGW2Name) {
            return (await this._instance.db.memberModel
                .findOne({gw2Name: name})
                .exec()) as IMemberDocument;
        } else {
            return (await this._instance.db.memberModel
                .findOne({discordTag: name})
                .exec()) as IMemberDocument;
        }
    }

    public static async query_training_requests(filter?: Object, pagination?: {page: number, pageSize: number}): Promise<ITrainingRequestDocument[]> {
        if (pagination) {
            return (await this._instance.db.trainingRequestModel
                .find(filter ? filter : {})
                .skip(pagination.pageSize * (pagination.page - 1))
                .limit(pagination.pageSize)
                .exec()) as ITrainingRequestDocument[];
        } else {
            return (await this._instance.db.trainingRequestModel
                .find(filter ? filter : {})
                .exec()) as ITrainingRequestDocument[];
        }
    }
}