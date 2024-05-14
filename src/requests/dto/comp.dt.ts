import {
    IRaidCompositionPopulatedDocument,
    IRaidCompositionRole,
    RoleType,
} from "@RTIBot-DB/documents/IRaidCompositionDocument";

export class CompositionDto {
    name: string;
    categories: string[];
    roles: IRaidCompositionRole[];

    static fromDocument(
        document: IRaidCompositionPopulatedDocument,
    ): CompositionDto {
        return {
            name: document.name,
            categories: document.categories.map((category) => {
                return category.name;
            }),
            roles: document.roles.map((role) => {
                return {
                    name: role.name,
                    requiredParticipants: role.requiredParticipants,
                    type: role.type ?? RoleType.Basic,
                    listIndex: role.listIndex,
                };
            }),
        };
    }
}
