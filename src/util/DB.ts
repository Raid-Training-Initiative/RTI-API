import { IMemberDocument } from "@RTIBot-DB/documents/IMemberDocument";
import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";
import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { IRaidEventDocument } from "@RTIBot-DB/documents/IRaidEventDocument";
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

    public static async queryComps(filter?: Object): Promise<IRaidCompositionPopulatedDocument[]> {
        return (await this._instance.db.raidCompositionModel
            .find(filter ? filter: {})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument[];
    }

    public static async queryComp(compName: string): Promise<IRaidCompositionPopulatedDocument> {
        return (await this._instance.db.raidCompositionModel
            .findOne({name: compName})
            .populate("categories")
            .exec()) as IRaidCompositionPopulatedDocument;
    }

    public static async queryCategories(filter?: Object): Promise<IRaidCompositionCategoryDocument[]> {
        return (await this._instance.db.raidCompositionCategoryModel
            .find(filter ? filter : {})
            .exec()) as IRaidCompositionCategoryDocument[];
    }

    public static async queryCategory(categoryName: string): Promise<IRaidCompositionCategoryDocument> {
        return (await this._instance.db.raidCompositionCategoryModel
            .findOne({name: categoryName})
            .exec()) as IRaidCompositionCategoryDocument;
    }

    public static async queryRaids(filter?: Object): Promise<IRaidEventDocument[]> {
        return (await this._instance.db.raidEventModel
            .find(filter ? filter : {})
            .exec()) as IRaidEventDocument[];
    }

    public static async queryRaid(raidId: string): Promise<IRaidEventDocument> {
        return (await this._instance.db.raidEventModel
            .findOne({_id: raidId})
            .exec()) as IRaidEventDocument;
    }

    public static async queryMembers(filter?: Object): Promise<IMemberDocument[]> {
        return (await this._instance.db.memberModel
            .find(filter ? filter : {})
            .exec()) as IMemberDocument[];
    }
}