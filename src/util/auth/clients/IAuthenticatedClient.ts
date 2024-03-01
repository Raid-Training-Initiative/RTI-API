export default interface IAuthenticatedClient {
    readonly token: string;
    readonly id: string;
    readonly expired: boolean;

    recordActivity(): void;
}
