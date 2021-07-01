
import { OdooRESTAbstract } from "./rest/odoo"

import * as e from "./rest/exception"
import * as t from "./type"

import { BackendFactories } from "./backend"


// Load backends

import "./backend/cyclos"



abstract class LokAPIAbstract {

    // These are kind of exchangeable libraries, you must provide
    // an implementation of these.

    abstract request: t.HttpRequest
    abstract base64encode: t.Base64Encode

    // User data

    public backends: any

    constructor(host: string, dbName: string) {
        // We'll lazy load the subclassing of OdooRESTAbstract
        // as we can't access in this constructor to this.request
        // this.base64encode to transfer them.
        this._dbName = dbName
        this._host = host
    }


    // In charge with all odoo requests

    private _dbName: string
    private _host: string
    private _odoo: OdooRESTAbstract

    public get odoo() {
        if (!this._odoo) {
            let { request, base64encode } = this
            class OdooREST extends OdooRESTAbstract {
                request = request
                base64encode = base64encode
            }
            this._odoo = new OdooREST(this._host, this._dbName)
        }
        return this._odoo
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
        let backends = []
        let { request, base64encode } = this
        if (userData.backends) {
            userData.backends.forEach(accountData => {
                let BackendClassAbstract = BackendFactories[accountData.type]
                class Backend extends BackendClassAbstract {
                    request = request
                    base64encode = base64encode

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

}


export { LokAPIAbstract, e, t }