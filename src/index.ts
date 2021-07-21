
import { OdooRESTAbstract } from "./rest/odoo"

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
            this._backend_credentials = await this.$post('/partner/backend_credentials')
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
        let { httpRequest, base64Encode, persistentStore } = this
        backend_credentials.forEach((backendData: any) => {
            let BackendClassAbstract = BackendFactories[backendData.type]
            if (!BackendClassAbstract) {
                console.log(`Data received for unknown backend ${backendData.type}`)
                return
            }
            class Backend extends BackendClassAbstract {
                httpRequest = httpRequest
                base64Encode = base64Encode
                persistentStore = persistentStore

                // This function declaration seems necessary for typescript
                // to avoid having issues with this dynamic abstract class
                constructor(...args) { super(...args) }
            }
            let backend: any
            try {
                backend = new Backend(backendData)
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
    public async searchRecipient(value: string): Promise<Array<t.IRecipient>> {
        // XXXvlab: to cache with global cache decorator that allow fine control
        // of forceRefresh
        let backends = await this.getBackends()
        let partners = await this.$post('/partner/partner_search', {
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
     * Transfer amount between 2 accounts. First account is supposed
     * to be logged in and linked to an authentified backend. Second
     * account should belong to same backend.
     *
     * @param fromAccount Source account for transfer, from ``.getAccounts()``
     * @param recipient Recipient for the transfer, from ``.searchRecipient(..)``
     * @param amount Amount of the transfer (ie: "100.02")
     * @param description Text to decribe the transaction
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async transfer(fromAccount: any,
        recipient: t.IRecipient,
        amount: number,
        description: string): Promise<t.IPayment> {
        // XXXvlab: this check is not working yet and need to be more
        // thought through
        // if (fromAccount.backend.internalId !== recipient.backend.internalId) {
        //     throw new Error("Transfer across backends is not supported.")
        // }
        return await fromAccount.transfer(recipient, amount, description)
    }


    /**
     * Get history of transactions on all backends.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async getTransactions(): Promise<any> {
        let backends = await this.getBackends()
        let lokapiTransactions = []
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