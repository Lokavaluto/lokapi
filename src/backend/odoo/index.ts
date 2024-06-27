import { JsonRESTPersistentClientAbstract } from '../../rest'
import { Contact } from './contact'
import {
    e as httpRequestExc,
    t as httpRequestType
} from '@0k/types-request'

import * as t from '../../type'

import * as e from '../../rest/exception'

import { makePasswordChecker } from '../utils'


export abstract class OdooRESTAbstract extends JsonRESTPersistentClientAbstract {

    API_VERSION = 12

    AUTH_HEADER = 'API-KEY'
    internalId = 'odoo'

    dbName: string

    connectionData: {
        server_api_version: string
        login: string
        uid: number
    }

    userProfile: any


    constructor (host: string, dbName?: string) {
        super(host)
        this.dbName = dbName
        this.authHeaders = {}
    }

    async authenticate (login: string, password: string): Promise<any> {
        try {
            const response = await this.post(
                '/auth/authenticate',
                {
                    api_version: this.API_VERSION,
                    params: ['lcc_app'],
                    ...(this.dbName && { db: this.dbName })
                },
                {
                    Authorization: `Basic ${this.base64Encode(
                        `${login}:${password}`
                    )}`,
                }
            )
            if (response.status === 'Error') {
                if (response.error === 'Access denied') {
                    throw new e.InvalidCredentials('Access denied')
                } else {
                    throw new e.APIRequestFailed(
                        `Could not obtain token: ${response.error}`
                    )
                }
            }
            if (response.api_version !== this.API_VERSION) {
                console.log(
                    'Warning: API Version Mismatch ' +
                        `between client (${this.API_VERSION}) ` +
                        `and server (${response.api_version})`
                )
            }
            this.apiToken = response.api_token
            return response
        } catch (err) {
            console.log('Odoo Authentication Failed:', err.message)
            this.apiToken = undefined
            throw err
        }
    }


    /**
     * Triggers the odoo request password process for given user
     * login. Use `.canResetPassword()` to check if this functionality
     * is available before using it.
     *
     * @param {string} login - Full user identifier on odoo server
     *                         (ie: john.doe@company.com)
     * @returns {Promise<void>}
     *
     * @throws {InvalidUserOrEmail, RequestFailed, APIRequestFailed, InvalidJson, Error}
     */
    async resetPassword (login: string): Promise<void> {
        const response = await this.post('/auth/reset_password', { login })
        if (response.status === 'Error') {
            if (response.error.includes('invalid username or email')) {
                throw new e.InvalidUserOrEmail('Invalid user or email')
            }
            console.log(
                "'resetPassword' returned with unexpected error: " +
                    response.error
            )
            throw new Error(response.error)
        }
    }


    /**
     * Asks odoo if reset password process is enabled.
     *
     * @returns {Promise<Boolean>} Wether reset password is enabled
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidJson}
     */
    canResetPassword (): Promise<Boolean> {
        return this.post('/auth/can_reset_password')
    }


    /**
     * Perform Signup of a new user in odoo. Use `.canSignup()` to
     * check if this functionality is available before using it.
     *
     * @returns {Promise<void>}
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidJson}
     */
    async signup (
        login: string,
        firstname: string,
        lastname: string,
        password: string,
    ): Promise<void> {
        const response = await this.post('/auth/signup', {
            login,
            firstname,
            lastname,
            password,
        })
        if (response.status === 'Error') {
            if (response.error.includes('user is already registered')) {
                throw new e.UserOrEmailAlreadyTaken(
                    'User or email already taken'
                )
            }
            console.log(
                "'signup' request returned an unexpected error: " +
                    response.error
            )
            throw new Error(response.error)
        }
    }


    /**
     * Asks odoo if signup process is enabled.
     *
     * @returns {Promise<Boolean>} Whether signup is enabled
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidJson}
     */
    canSignup (): Promise<Boolean> {
        return this.post('/auth/can_signup')
    }


    private getHTMLErrorMessage (htmlString: string): string {
        const parser = new DOMParser()
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

    public async request (path: string, opts: t.HttpOpts): Promise<any> {
        let response: any
        try {
            response = await super.request(path, opts)
        } catch (err) {
            if (err instanceof httpRequestExc.HttpError && err.code === 401) {
                console.log('Odoo AccessDenied: Authentication Required')
                throw new e.AuthenticationRequired(
                    err.code, 'Authentication Failed',
                    err.data, err.response
                )
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
     * @returns {Object} authData
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     */
    public async login (login: string, password: string): Promise<any> {
        const authData = await this.authenticate(login, password)
        this.connectionData = {
            server_api_version: authData.api_version,
            login: login,
            uid: authData.uid,
        }
        this._getMyContact = this.makeContact(authData.prefetch.partner)
        return authData
    }


    _getMyContact: t.IContact
    private makeContact (jsonData): t.IContact {
        return new Contact(
                { odoo: this }, this, { odoo: jsonData }
        )
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
    public async getMyContact (): Promise<t.IContact> {
        if (!this._getMyContact) {
            this._getMyContact = this.makeContact(await this.$get('/partner/0'))
        }
        return this._getMyContact
    }


    isPasswordStrongEnoughSync = makePasswordChecker([
        'tooShort:8',
        'noUpperCase',
        'noLowerCase',
        'noDigit',
        // "noSymbol",
    ])

    /**
     * Check password strength for odoo new user account
     *
     * @param password The password to check
     *
     * @returns string[] list of violated rules
     */
    public async isPasswordStrongEnough (
        password: string
    ): Promise<Array<string>> {
        return this.isPasswordStrongEnoughSync(password)
    }


    /**
     * Register the account as active in the administrative backend
     * and synchronize some other information from financial backend.
     *
     * @param accounds The account data necessary to identify the account and
     *                 send some additional data
     *
     * @returns void
     */
    public async activateAccount (accounts: t.JsonData[]) {
        let res
        try {
            res = await this.$post('/partner/account_activate', {
            accounts
        })
        } catch(err) {
            if (err instanceof httpRequestExc.HttpError && err.code === 403) {
                throw new LokAPIExc.PermissionDenied("Permission denied to activate account")
            }

        }
        if (!res) {
            throw new Error(
                'Admin backend refused activation of one or more account',
            )
        }
    }

}


httpRequestType.httpMethods.forEach((method) => {
    const methodLc = method.toLowerCase()
    OdooRESTAbstract.prototype[methodLc] = function (
        path: string,
        data?: any,
        headers?: any,
        responseHeaders?: {[k: string]: any}
    ) {
        return JsonRESTPersistentClientAbstract.prototype[methodLc].apply(
            this,
            [`/lokavaluto_api/public${path}`, data, headers, responseHeaders]
        )
    }
    OdooRESTAbstract.prototype['$' + methodLc] = function (
        path: string,
        data?: any,
        headers?: any,
        responseHeaders?: {[k: string]: any}
    ) {
        return JsonRESTPersistentClientAbstract.prototype[
            '$' + methodLc
        ].apply(this, [`/lokavaluto_api/private${path}`, data, headers, responseHeaders])
    }
})
