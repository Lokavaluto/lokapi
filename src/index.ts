
import * as e from "./exception"
import * as t from "./type"



class LokAPI {

    httpRequest: t.IHttpRequest
    base64encode: t.Base64Encode

    host: string
    dbName: string

    // User data

    apiToken: string
    userData: {
        login: string
        partner_id: number
        uid: number
    }
    userProfile: any

    // Constants

    COMMON_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    constructor(host: string, dbName: string, mixin: any) {
        this.dbName = dbName
        this.host = host
        this.httpRequest = mixin.httpRequest
        this.base64encode = mixin.base64encode
        this.userData = null
    }

    async _req(path: string, opts: t.HttpOpts): Promise<any> {
        let headers = Object.assign({}, this.COMMON_HEADERS, opts.headers)
        let rawData: any
        if (
            (typeof this.host === undefined) ||
            (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(this.host))
        ) {
            console.log("InvalidHost: You might want to check APP_HOST environment variable.")
            return new e.InvalidConnectionDetails(`Invalid value for host: ${this.host}`)
        }
        try {
            rawData = await this.httpRequest.request({
                host: this.host,
                path: path,
                headers: headers,
                method: opts.method,
                data: opts.data,
            })
        } catch (err) {
            console.log(`Failed ${opts.method} request to ${path} (Host: ${this.host})`)
            throw err
        }
        let parsedData: any
        try {
            parsedData = JSON.parse(rawData);
        } catch (err) {
            const printableData = rawData.length > 200 ? `${rawData.slice(0, 200)}..` : rawData
            console.log(err)
            console.log(e)
            console.log(e.InvalidJson)
            throw new e.InvalidJson(`Data is not parseable JSON: ${printableData}`)
        }
        return parsedData
    }

    async _getToken(login: string, password: string): Promise<any> {
        try {
            let promise = this._req(
                '/lokavaluto_api/public/auth/authenticate', {
                method: "POST",
                headers: {
                    Authorization: `Basic ${this.base64encode(`${login}:${password}`)}`,
                },
                data: {
                    db: this.dbName,
                    params: ['lcc_app']
                }
            });
            let { response } = await promise
            if (response.status == "Error") {
                if (response.message == "access denied")
                    throw new e.InvalidCredentials("Access denied")
                else
                    throw new e.APIRequestFailed(`Could not obtain token: ${response.error} `)
            }
            this.apiToken = response.api_token;
            this.userData = {
                login: login,
                partner_id: response.partner_id,
                uid: response.uid,
            }
        } catch (err) {
            console.log('getToken failed: ', err.message);
            this.apiToken = undefined;
            throw err;
        }
    }

    /**
     * Log in to lokavaluto server target API
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns null
     */
    async login(login: string, password: string): Promise<any> {
        await this._getToken(login, password)
        this.userProfile = await this.getUserProfile(this.userData.partner_id);
    }


    /**
     * get given user's profile
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    async getUserProfile(userId: number) {
        const profile = await this._req(`/lokavaluto_api/private/partner/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "API-KEY": '14919095-d07d-4d8f-99f7-1f118a4df443',
            },
        })
        return profile || null;
    }

}


export { LokAPI, e, t }