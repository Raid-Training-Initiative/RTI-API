import IAuthenticatedClient from "./IAuthenticatedClient"

export default class AuthenticatedServiceClient implements IAuthenticatedClient {
    public readonly expired = false;

    constructor(
        public readonly token,
        public readonly id) {
    }

    public recordActivity() {
    }
}