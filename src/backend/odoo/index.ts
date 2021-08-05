import { JsonRESTPersistentClientAbstract } from "../../rest"
import { Contact } from "./contact"
import * as t from "../../type"

import * as e from "../../exception"


export abstract class OdooRESTAbstract extends JsonRESTPersistentClientAbstract {

    API_VERSION = 9

    AUTH_HEADER = "API-KEY"
    internalId = "odoo"

    dbName: string

    connectionData: {
        server_api_version: string
        login: string
        uid: number
    }
    userProfile: any


    constructor(host: string, dbName: string) {
        super(host)
        this.dbName = dbName
        this.authHeaders = {}
    }

    async authenticate(login: string, password: string): Promise<any> {
        try {
            let response = await this.post(
                '/auth/authenticate',
                {
                    api_version: this.API_VERSION,
                    db: this.dbName,
                    params: ['lcc_app']
                },
                {
                    Authorization: `Basic ${this.base64Encode(`${login}:${password}`)}`,
                }
            );
            if (response.status == "Error") {
                if (response.message == "access denied")
                    throw new e.InvalidCredentials("Access denied")
                else
                    throw new e.APIRequestFailed(`Could not obtain token: ${response.error}`)
            }
            if (response.api_version !== this.API_VERSION) {
                console.log("Warning: API Version Mismatch " +
                    `between client (${this.API_VERSION}) ` +
                    `and server (${response.api_version})`)
            }
            this.apiToken = response.api_token
            return response
        } catch (err) {
            console.log('authenticate failed: ', err.message)
            this.apiToken = undefined
            throw err
        }
    }

    private getHTMLErrorMessage(htmlString: string): string {
        let parser = new DOMParser()
        let htmlDoc: any
        let errMessage: any
        try {
            htmlDoc = parser.parseFromString(htmlString, 'text/html')
        } catch (err) {
            console.log('Unexpected HTML parsing error:', err)
            throw err
        }

        try {
            errMessage = htmlDoc.head.getElementsByTagName('title')[0].innerHTML
        } catch (err) {
            console.log('Unexpected HTML structure:', err)
            throw err
        }

        return errMessage
    }

    public async request(path: string, opts: t.HttpOpts): Promise<any> {
        let response: any
        try {
            response = await super.request(path, opts)
        } catch (err) {
            // XXXvlab: `err instanceof e.HttpError` is giving false
            if (err.constructor.name === "HttpError" && err.code == 500) {
                let errMessage: string
                try {
                    errMessage = this.getHTMLErrorMessage(err.data)
                } catch (err2) {
                    console.log('Could not get error message in HTML from request body', err2)
                    throw err
                }
                if (errMessage.startsWith("odoo.exceptions.AccessDenied")) {
                    console.log('Authentication Required')
                    throw new e.AuthenticationRequired("Authentication Failed")
                }
            }
            throw err
        }
        return response
    }

    /**
     * Log in to lokavaluto server target API. It actually will probe
     * server by asking for a session token.
     *
     * @param {string} login - Full user identifier on odoo server
     *                         (ie: john.doe@company.com)
     * @param {string} password - Password of given user identifier
     *
     * @returns {Object} autData
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     */
    public async login(login: string, password: string): Promise<any> {
        let authData = await this.authenticate(login, password)
        this.connectionData = {
            server_api_version: authData.api_version,
            login: login,
            uid: authData.uid,
        }
        this.userProfile = authData.prefetch.partner
        return authData
    }


    /**
     * Get Contact of given contact id's. If no id is specified, returns the
     * current logged in user's `Contact` info.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @param user The integer of the target partner's id in
     *             odoo. If not specified it'll take the value 0,
     *             which has a special meaning of 'me', the current
     *             logged in user.
     *
     * @returns {Object
     */
    public async getMyContact(): Promise<t.IContact> {
        return new Contact({ odoo: this }, this, { odoo: await this.$get(`/partner/0`) })
    }

}


t.httpMethods.forEach((method) => {
    let methodLc = method.toLowerCase()
    OdooRESTAbstract.prototype[methodLc] = function(
        path: string, data?: any, headers?: any) {
        return JsonRESTPersistentClientAbstract.prototype[methodLc].apply(this,
            [`/lokavaluto_api/public${path}`, data, headers])
    }

    OdooRESTAbstract.prototype["$" + methodLc] = function(
        path: string, data?: any, headers?: any) {
        return JsonRESTPersistentClientAbstract.prototype['$' + methodLc].apply(this,
            [`/lokavaluto_api/private${path}`, data, headers])
    }
})
