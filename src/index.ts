
import { OdooRESTAbstract } from "./rest/odoo"

import * as e from "./rest/exception"
import * as t from "./type"

import { BackendFactories } from "./backend"


// Load backends

import "./backend/cyclos"


abstract class LokAPIAbstract extends OdooRESTAbstract {

    // User data

    public backends: any


    /**
     * Log in to Lokavaluto Odoo server target API.
     *
     * @param {string} login - Full user identifier on odoo server
     *                         (ie: john.doe@company.com)
     * @param {string} password - Password of given user identifier
     *
     * @returns null
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     */
    public async login(login: string, password: string): Promise<any> {
        let userData = await super.login(login, password)
        let backends = []
        let { httpRequest, base64Encode, persistentStore } = this
        if (userData.backends) {
            userData.backends.forEach(accountData => {
                let BackendClassAbstract = BackendFactories[accountData.type]
                if (!BackendClassAbstract) {
                    console.log(`Data received for unknown backend ${accountData.type}`)
                    return;
                }
                class Backend extends BackendClassAbstract {
                    httpRequest = httpRequest
                    base64Encode = base64Encode
                    persistentStore = persistentStore

                    // This function declaration seems necessary for typescript
                    // to avoid having issues with this dynamic abstract class
                    constructor(...args) { super(...args) }
                }
                backends.push(new Backend(accountData))
            })
            this.backends = backends
        } else {
            this.backends = []
        }
        return true
    }


    /**
     * Get list of backends
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    async getBackends(): Promise<any> {
        return this.backends
    }

}


export { LokAPIAbstract, e, t }