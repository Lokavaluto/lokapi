import * as e from "./exception"


import { JsonRESTClientAbstract } from "."


export abstract class OdooRESTAbstract extends JsonRESTClientAbstract {

    API_VERSION = 1

    dbName: string

    userData: {
        login: string
        partner_id: number
        uid: number
    }
    userProfile: any


    constructor(host: string, dbName: string) {
        super(host)
        this.dbName = dbName
        this.authHeaders = {}
    }

    _apiToken: string

    set apiToken(apiToken: string) {
        if (apiToken) {
            this.authHeaders["API-KEY"] = apiToken
        } else {
            delete this.authHeaders["API-KEY"]
        }
        this._apiToken = apiToken
    }


    get apiToken(): string {
        return this._apiToken
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
            return {
                login: login,
                partner_id: response.partner_id,
                uid: response.uid,
                backends: response.monujo_backends,
                api_version: response.api_version
            }
        } catch (err) {
            console.log('getToken failed: ', err.message)
            this.apiToken = undefined
            throw err
        }
    }


    /**
     * Log in to lokavaluto server target API. It actually will probe
     * server by asking for a session token.
     *
     * @param {string} login - Full user identifier on odoo server
     *                         (ie: john.doe@company.com)
     * @param {string} password - Password of given user identifier
     *
     * @returns null
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     */
    async login(login: string, password: string): Promise<any> {
        this.userData = await this.authenticate(login, password)
        this.userProfile = await this.getUserProfile(this.userData.partner_id);
        return this.userData
    }


    /**
     * Log out from lokavaluto server
     *
     * @returns null
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     */
    async logout(): Promise<void> {
        this.apiToken = null
    }


    /**
     * Get given user's profile
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    async getUserProfile(userId: number) {
        const profile = await this.$get(`/partner/${userId}`)
        return profile || null
    }

}



let METHODS = "get post put delete"

METHODS.split(" ").forEach(method => {
    OdooRESTAbstract.prototype[method] = function(
        path: string, data?: any, headers?: any) {
        return JsonRESTClientAbstract.prototype[method].apply(this,
            [`/lokavaluto_api/public${path}`, data, headers])
    }

    OdooRESTAbstract.prototype["$" + method] = function(
        path: string, data?: any, headers?: any) {
        return JsonRESTClientAbstract.prototype['$' + method].apply(this,
            [`/lokavaluto_api/private${path}`, data, headers])
    }
})
