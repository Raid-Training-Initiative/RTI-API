import { IRaidCompositionCategoryDocument } from "@RTIBot-DB/documents/IRaidCompositionCategoryDocument";

export class CategoryDto {
    name: string;

    static fromDocument(
        document: IRaidCompositionCategoryDocument,
    ): CategoryDto {
        return { name: document.name };
    }
}
