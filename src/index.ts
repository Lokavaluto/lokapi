
import { OdooRESTAbstract } from './backend/odoo'

import * as e from './rest/exception'
import * as t from './type'

import { mux } from './generator'

import { BackendAbstract } from './backend'
import { getHostOrUrlParts } from './rest'


abstract class LokAPIAbstract extends OdooRESTAbstract {

    abstract BackendFactories: { [k:string]: any }

    async requestLocalPassword (state: string): Promise<any> {
        throw new Error('No `.requestLocalPassword(..)` method provided')
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
    public async login (login: string, password: string): Promise<any> {
        const authData = await super.login(login, password)
        this._backendCredentials = authData.prefetch.backend_credentials
        this._backends = false // force prefetch
        return true
    }


    /**
     * Get backend credentials
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    private async getBackendCredentials (): Promise<any> {
        // XXXvlab: cached, should transition to general cache
        // decorator to allow fine control of when we required a
        // fetch.
        if (!this._backendCredentials) {
            if (!this._backendCredentialsPromise) {
                this._backendCredentialsPromise = this.$post(
                    '/partner/backend_credentials'
                )
            }
            this._backendCredentials = await this._backendCredentialsPromise
            this._backendCredentialsPromise = null
        }
        return this._backendCredentials
    }

    private _backendCredentialsPromise: any
    private _backendCredentials: any


    /**
     * Get list of backends
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    private async getBackends (): Promise<any> {
        // XXXvlab: cached, should transition to general cache
        // decorator to allow fine control of when we required a
        // fetch.
        if (!this._backends) {
            if (!this._backendsPromise) {
                const self = this
                this._backendsPromise = (async function () {
                    const backendCredentials = await self.getBackendCredentials()
                    return self.makeBackends(backendCredentials)
                })()
            }
            this._backends = await this._backendsPromise
            this._backendsPromise = null
        }
        return this._backends
    }

    private _backendsPromise: any
    private _backends: any


    private makeBackends (backendCredentials: any): any {
        const self = this
        const backends = {}
        const {
            httpRequest, base64Encode, persistentStore,
            requestLogin, requestLocalPassword
        } = this
        backendCredentials.forEach((backendData: any) => {
            const BackendClassAbstract = <any>self.BackendFactories[backendData.type]
            if (!BackendClassAbstract) {
                console.log(
                    `Data received for unknown backend ${backendData.type}`
                )
                return
            }
            class Backend extends BackendClassAbstract {
                httpRequest = httpRequest
                base64Encode = base64Encode
                persistentStore = persistentStore
                requestLogin = requestLogin
                requestLocalPassword = requestLocalPassword

                // This function declaration seems necessary for typescript
                // to avoid having issues with this dynamic abstract class
                // eslint-disable-next-line no-useless-constructor
                constructor (...args) {
                    super(...args)
                }
            }
            let backend: any
            try {
                backend = new Backend({ odoo: this }, backendData)
            } catch (err) {
                console.log(`Backend ${backendData.type} creation failed:`, err)
                return
            }
            backends[backend.internalId] = backend
        })
        return backends
    }


    /**
     * Get list of Accounts
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async getAccounts (): Promise<any> {
        // XXXvlab: to cache with global cache decorator that allow fine control
        // of forceRefresh
        const backends = await this.getBackends()
        const lokapiBankAccounts = []
        for (const id in backends) {
            const backend = backends[id]
            // XXXvlab: should go for parallel waits
            const bankAccounts = await backend.getAccounts()
            bankAccounts.forEach((bankAccount: any) => {
                lokapiBankAccounts.push(bankAccount)
            })
        }
        return lokapiBankAccounts
    }


    /**
     * Get list of non-Professional Recipients (contacts with an
     * account information that can receive money from me) matching
     * given string filter. Note that if value is empty, it'll list
     * only all the favorites. If value is not empty, it'll filter by
     * value in all recipient (favorites or not) and return result
     * ordered by `favorite` and `name`.
     *
     * @param value The given string will be searched in name, email, phone
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Array<t.IRecipient>
     */
    public async searchRecipients (
        value: string,
    ): Promise<t.IRecipient[]> {
        const backends = await this.getBackends()
        const partners = await this.$get('/partner/search', {
            value: value,
            backend_keys: Object.keys(backends),
            order: 'is_favorite desc, name',
        })
        const recipients = []
        const markBackend = Object.keys(backends).length > 1
        partners.rows.forEach((partnerData: any) => {
            Object.keys(partnerData.monujo_backends).forEach(
                (backendId: string) => {
                    if (!backends[backendId].jsonData.accounts.length) {
                        return  // don't have this backend anyway
                    }
                    const backendRecipients = backends[backendId].makeRecipients(
                        partnerData
                    )
                    backendRecipients.forEach((recipient: any) => {
                        recipient.markBackend = markBackend
                        recipients.push(recipient)
                    })
                }
            )
        })
        return recipients
    }


    /**
     * Same as searchRecipients(), but returning only professional
     * recipients.
     *
     * Paging is available and should be used.
     *
     * @param value The given string will be searched in name, email, phone
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Array<t.IRecipient>
     */
    public async searchProRecipients (
        value: string,
    ): Promise<t.IRecipient[]> {
        // XXXvlab: to cache with global cache decorator that allow fine control
        // of forceRefresh
        const backends = await this.getBackends()
        const partners = await this.$get('/partner/search', {
            value: value,
            backend_keys: Object.keys(backends),
            order: 'is_favorite desc, name',
            is_company: 1,
        })
        const recipients = []
        partners.rows.forEach((partnerData: any) => {
            Object.keys(partnerData.monujo_backends).forEach((backendId: string) => {
                let backendRecipients = backends[backendId].makeRecipients(partnerData)
                backendRecipients.forEach((recipient: any) => {
                    recipients.push(recipient)
                })
            })
        })
        return recipients
    }


    /**
     * Get recipients from a QR code url string. It'll return a recipient per
     * backend.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @param url The QR code url identifying a user
     *
     * @returns {Object
     */
    public async getRecipientsFromUrl (url: string): Promise<t.IRecipient[]> {
        const backends = await this.getBackends()
        const urlParts = getHostOrUrlParts(url)
        if (
            urlParts.protocol !== this.protocol ||
            urlParts.host !== this.host ||
            urlParts.port !== this.port
        ) {
            throw new e.UrlFromWrongServer(
                'Url provided is not from current server'
            )
        }
        let id: number
        try {
            id = parseInt(url.split('-').slice(-1)[0])
        } catch (err) {
            throw new Error(`Invalid url ${url}`)
        }
        let partner: any
        try {
            partner = await this.$get(`/partner/get`, {
                id,
                backend_keys: Object.keys(backends),
            })
        } catch (err) {
            if (err instanceof e.HttpError && err.code === 404) {
                return []
            }
        }
        const recipients = []
        Object.keys(partner.monujo_backends).forEach((backendId: string) => {
            const backendRecipients = backends[backendId].makeRecipients(partner)
            backendRecipients.forEach((recipient: any) => {
                recipients.push(recipient)
            })
        })
        return recipients
    }


    /**
     * Get history of transactions on all backends for currently
     * logged in user. Transactions will be sorted from smaller to
     * greater according to ``order`` function.
     *
     * @param order A function taking 2 transactions t1, t2 and
     *              returning a number. If return value is < 0 then t1
     *              < t2, if return value is 0, then t1 == t2, and
     *              otherwise, t1 > t2.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns AsyncGenerator
     */
    public async * getTransactions (order?: (x: any, y: any) => number): AsyncGenerator {
        order = order || ((x: any, y: any) => y.date.getTime() - x.date.getTime())
        const backends = await this.getBackends()
        yield * mux(
            Object.values(backends).map(
                (b: BackendAbstract) => b.getTransactions(order)),
            order
        )
    }

}


export { LokAPIAbstract, e, t }
