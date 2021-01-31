import { IRaidCompositionPopulatedDocument } from "@RTIBot-DB/documents/IRaidCompositionDocument";
import { MongoDatabase } from "@RTIBot-DB/MongoDatabase";

export class Comps {
    public static async list_payload(db: MongoDatabase): Promise<string> {
        const documents = (await db.raidCompositionModel.find().populate("categories")) as IRaidCompositionPopulatedDocument[];
        const formattedDocuments = documents.map(document => {
            return {
                name: document.name,
                categories: document.categories.map(category => {
                    return category.name
                }),
                roles: document.roles.map(role => {
                    return {
                        name: role.name,
                        requiredParticipants: role.requiredParticipants
                    }
                })
            };
        });
        
        return JSON.stringify(formattedDocuments);
    }
}