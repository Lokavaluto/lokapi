import * as e from "./exception"


import { JsonRESTClient } from "."


export class OdooREST extends JsonRESTClient {

    dbName: string
    apiToken: string

    userData: {
        login: string
        partner_id: number
        uid: number
    }
    userProfile: any


    constructor(host: string, dbName: string, mixin: any) {
        super(host, mixin)
        this.dbName = dbName
    }


    async authenticate(login: string, password: string): Promise<any> {
        try {
            let response = await this._req(
                '/lokavaluto_api/public/auth/authenticate', {
                method: "POST",
                headers: {
                    Authorization: `Basic ${this.base64encode(`${login}:${password}`)}`,
                },
                data: {
                    api_version: 1,
                    db: this.dbName,
                    params: ['lcc_app']
                }
            });
            if (response.status == "Error") {
                if (response.message == "access denied")
                    throw new e.InvalidCredentials("Access denied")
                else
                    throw new e.APIRequestFailed(`Could not obtain token: ${response.error} `)
            }
            this.authHeaders = {
                "API-KEY": response.api_token,
            }
            return {
                login: login,
                partner_id: response.partner_id,
                uid: response.uid,
                backends: response.monujo_accounts
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
     * get given user's profile
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    async getUserProfile(userId: number) {
        const profile = await this._authReq(`/lokavaluto_api/private/partner/${userId}`, {
            method: "GET"
        })
        return profile || null
    }

}

