
import { OdooRESTAbstract } from './backend/odoo'

import * as e from './rest/exception'
import * as t from './type'

import { BackendFactories } from './backend'
import { getHostOrUrlParts } from './rest'

// Load backends

import './backend/cyclos'


abstract class LokAPIAbstract extends OdooRESTAbstract {

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
            this._backendCredentials = await this.$post(
                '/partner/backend_credentials'
            )
        }
        return this._backendCredentials
    }

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
            const backendCredentials = await this.getBackendCredentials()
            this._backends = this.makeBackends(backendCredentials)
        }
        return this._backends
    }

    private _backends: any

    private makeBackends (backendCredentials: any): any {
        const backends = {}
        const { httpRequest, base64Encode, persistentStore, requestLogin } = this
        backendCredentials.forEach((backendData: any) => {
            const BackendClassAbstract = BackendFactories[backendData.type]
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
     * Get list of Recipients (contacts with an account information
     * that can receive money from me) matching given string
     * filter. Note that if value is empty, it'll list only all the
     * favorites. If value is not empty, it'll filter by value in all
     * recipient (favorites or not) and return result ordered by
     * `favorite` and `name`.
     *
     * Paging is available and should be used.
     *
     * @param value The given string will be searched in name, email, phone
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Array<t.IRecipient>
     */
    public async searchRecipients(
        value,
        // XXXvlab: a reflection on forcing a standard paging
        // increment to maximize cache hit on the server should
        // probably be done
        opts: {
            offset?: number
            limit?: number
        } = {}
    ): Promise<t.IRecipient[]> {
        // XXXvlab: to cache with global cache decorator that allow fine control
        // of forceRefresh
        const backends = await this.getBackends()
        const partners = await this.$get('/partner/search', {
            value: value,
            backend_keys: Object.keys(backends),
            order: 'is_favorite desc, name',
            ...opts,
            ...value === "" && { is_favorite: true }
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
     * Get history of transactions on all backends for currently logged in user.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async getTransactions (): Promise<any> {
        const backends = await this.getBackends()
        const lokapiTransactions = []
        for (const id in backends) {
            const backend = backends[id]
            // XXXvlab: should go for parallel waits
            const transactions = await backend.getTransactions()
            transactions.forEach((transaction: any) => {
                lokapiTransactions.push(transaction)
            })
        }
        return lokapiTransactions
    }

}


export { LokAPIAbstract, e, t }
