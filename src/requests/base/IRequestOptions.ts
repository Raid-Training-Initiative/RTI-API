import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";

export default interface RequestOptions {
    authenticated?: {
        permissions: MemberPermission[],
    }
    paginated?: boolean,
    multiFormat?: boolean
}