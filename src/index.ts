
import { OdooREST } from "./rest/odoo"

import * as e from "./rest/exception"
import * as t from "./type"

import { BackendFactories } from "./backend"


// Load backends

import "./backend/cyclos"



class LokAPI {

    // In charge with all odoo requests

    public odoo: OdooREST

    // These are kind of exchangeable libraries

    private mixin: {
        httpRequest: t.IHttpRequest,
        base64encode: t.Base64Encode,
        backendFactory: any
    }

    // User data

    public userData: {
        login: string
        partner_id: number
        uid: number
    }

    public userProfile: any

    public backends: any

    constructor(host: string, dbName: string, mixin: any) {
        this.odoo = new OdooREST(host, dbName, mixin)

        // Keeping them to forward to account REST access
        this.mixin = mixin
    }


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
        let userData = await this.odoo.login(login, password)
        let mixin = this.mixin
        let backends = []
        if (userData.backends) {
            userData.backends.forEach(accountData => {
                backends.push(new BackendFactories[accountData.type](accountData, mixin))
            })
            this.backends = backends
        } else {
            this.backends = []
        }
        return true
    }

}


export { LokAPI, e, t }