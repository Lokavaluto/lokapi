
import { OdooRESTAbstract } from "./backend/odoo"

import * as e from "./rest/exception"
import * as t from "./type"

import { BackendFactories } from "./backend"


// Load backends

import "./backend/cyclos"


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
    public async login(login: string, password: string): Promise<any> {
        let authData = await super.login(login, password)
        this._backend_credentials = authData.prefetch.backend_credentials
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
    private async getBackendCredentials(): Promise<any> {
        // XXXvlab: cached, should transition to general cache decorator to allow
        // fine control of when we required a fetch.
        if (!this._backend_credentials) {
            this._backend_credentials = await this.$post(
                "/partner/backend_credentials"
            )
        }
        return this._backend_credentials
    }
    private _backend_credentials: any


    /**
     * Get list of backends
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    private async getBackends(): Promise<any> {
        // XXXvlab: cached, should transition to general cache decorator to allow
        // fine control of when we required a fetch.
        if (!this._backends) {
            let backend_credentials = await this.getBackendCredentials()
            this._backends = this.makeBackends(backend_credentials)
        }
        return this._backends
    }
    private _backends: any

    private makeBackends(backend_credentials: any): any {
        let backends = {}
        let { httpRequest, base64Encode, persistentStore, requestLogin } = this
        backend_credentials.forEach((backendData: any) => {
            let BackendClassAbstract = BackendFactories[backendData.type]
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
                constructor(...args) {
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
    public async getAccounts(): Promise<any> {
        // XXXvlab: to cache with global cache decorator that allow fine control
        // of forceRefresh
        let backends = await this.getBackends()
        let lokapiBankAccounts = []
        for (const id in backends) {
            let backend = backends[id]
            // XXXvlab: should go for parallel waits
            let bankAccounts = await backend.getAccounts()
            bankAccounts.forEach((bankAccount: any) => {
                lokapiBankAccounts.push(bankAccount)
            })
        }
        return lokapiBankAccounts
    }


    /**
     * Get list of Recipients (partners that can receive money from
     * me) matching given string filter.
     *
     * @param value The given string will be searched in name, email, phone
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Array<t.IRecipient>
     */
    public async searchRecipients(value: string): Promise<t.IRecipient[]> {
        // XXXvlab: to cache with global cache decorator that allow fine control
        // of forceRefresh

        let backends = await this.getBackends()
        let partners = await this.$get('/partner/partner_search', {
            "value": value,
            "backend_keys": Object.keys(backends),
            // "offset": 0,
            // "limit": 40,
        })
        let recipients = []
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
    public async getRecipientsFromUrl(url: string): Promise<t.IRecipient[]> {
        let backends = await this.getBackends()
        let partner
        try {
            partner = await this.$get("/partner/get_by_url", {
                url,
                backend_keys: Object.keys(backends),
            })
        } catch (err) {
            if (err instanceof e.HttpError && err.code === 404) {
                return []
            }
        }
        let recipients = []
        Object.keys(partner.monujo_backends).forEach((backendId: string) => {
            let backendRecipients = backends[backendId].makeRecipients(partner)
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
    public async getTransactions(): Promise<any> {
        const backends = await this.getBackends()
        const lokapiTransactions = []
        for (const id in backends) {
            let backend = backends[id]
            // XXXvlab: should go for parallel waits
            let transactions = await backend.getTransactions()
            transactions.forEach((transaction: any) => {
                lokapiTransactions.push(transaction)
            })
        }
        return lokapiTransactions
    }

}


export { LokAPIAbstract, e, t }