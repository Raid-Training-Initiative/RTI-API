import { MemberPermission } from "@RTIBot-DB/documents/IMemberRoleDocument";

export default interface IRequestOptions {
  authenticated?: {
    permissions: MemberPermission[];
  };
  paginated?: boolean;
  multiFormat?: boolean;
}
