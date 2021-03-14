import IAuthenticatedClient from "./IAuthenticatedClient"

export default class AuthenticatedServiceClient implements IAuthenticatedClient {
    constructor(
        public readonly token,
        public readonly id) {
    }
}