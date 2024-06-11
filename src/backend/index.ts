import { t as httpRequestType } from '@0k/types-request'

import * as t from '../type'
import { Record } from '../record'

/**
 * Base object to implement common API between data from
 * different backends. It can support multiple backends
 * for one object.
 */
export class BridgeObject {

    // XXXvlab: TODO: define IBackend
    protected backends: { [index: string]: any }
    protected parent: any
    protected jsonData: any  // XXXvlab: will need to put t.JsonData and data validators

    constructor (backends: { [index: string]: any }, parent, jsonData) {
        this.backends = backends
        this.parent = parent
        this.jsonData = jsonData
    }
}


export abstract class BackendAbstract {

    protected backends: { [index: string]: t.IBackend }
    protected jsonData

    protected abstract httpRequest: httpRequestType.HttpRequest
    protected abstract base64Encode: t.Base64Encode
    protected abstract persistentStore: t.IPersistentStore
    protected abstract requestLogin (): void
    public abstract requestLocalPassword: (state: string) => Promise<any>

    constructor (backends: any, jsonData: any) {
        this.backends = backends
        this.jsonData = jsonData
    }

    get internalId () {
        return this.jsonData.type
    }

    get minCreditAmount () {
        return this.jsonData?.min_credit_amount
    }

    get maxCreditAmount () {
        return this.jsonData?.max_credit_amount
    }

    get safeWalletRecipient () {
        const recipientData = this.jsonData?.safe_wallet_recipient
        if (!recipientData) {
            return null
        }
        const recipients = this.makeRecipients(recipientData)
        if (recipients.length > 1)
            throw new Error("Received more than 1 safe wallet")
        if (recipients.length === 0)
            throw new Error("Unexpected data for safe wallet")
        return recipients[0]
    }

    /**
     * By using a AsyncGenerator, getTransactions() allows :
     * - client app to request the amount of transaction they need at the pace
     *   they need.
     * - the backend implementation to make http request by batches of the size
     *   they want to optimize caching of server or other consideration.
     * It is also a constraint that is required to solve ordering issues when
     * several sources of transactions are to be re-ordered without asking all
     * transactions at once.
     */
    public async * getTransactions (order: any): AsyncGenerator {
        throw new Error('Backend does not implement `.getTransactions()` yet.')
    }

    public get userAccounts (): Array<any> {
        throw new Error('Backend does not implement `.userAccounts` yet.')
    }

    public async hasUserAccountValidationRights (): Promise<boolean> {
        const results = await Promise.all(
            Object.values(this.userAccounts).map((a: any) =>
                a.hasUserAccountValidationRights
                    ? a.hasUserAccountValidationRights()
                    : false
            )
        )
        return results.reduce((a: boolean, b: boolean) => a || b, false)
    }

    public async hasCreditRequestValidationRights (): Promise<boolean> {
        const results = await Promise.all(
            Object.values(this.userAccounts).map((a: any) =>
                a.hasCreditRequestValidationRights
                    ? a.hasCreditRequestValidationRights()
                    : false
            )
        )
        return results.reduce((a: boolean, b: boolean) => a || b, false)
    }

    abstract makeRecipients (jsonData: t.JsonData): t.IRecipient[]

    /**
     * Get list of Recipients (contacts with an account information
     * that can receive money from me) matching given string
     * filter. Note that if value is empty, it'll list only all the
     * recipients connected to favorite accounts. If value is not
     * empty, it'll filter by value in all recipient (favorites or
     * not) and return result ordered by `favorite` and `name`.
     *
     * @param value The given string will be searched in name, email, phone
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns AsyncIterable<t.IRecipient>
     */
    public async * searchRecipients (value: string): AsyncIterable<t.IRecipient> {
        let offset = 0
        const limit = 30
        while (true) {
            const partners = await this.backends.odoo.$get('/partner/search', {
                value: value,
                backend_keys: [this.internalId],
                offset,
                limit,
                order: 'is_favorite desc, name',
            })
            for (const partnerData of partners.rows) {
                const backendRecipients =
                    this.makeRecipients(partnerData)
                for (const recipient of backendRecipients) {
                    yield recipient
                }
            }
            if (partners.rows.length < limit) return
            offset += limit
        }
    }

    /**
     * Get recipient (contact with an account information that can
     * receive money from me) matching given data.
     *
     * @param data internal key required by the backend
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Promise<t.IRecipient>
     */
    public async searchRecipientByUri(data: t.JsonData): Promise<t.IRecipient> {
        let partner = await this.backends.odoo.$get(
            '/partner/get_recipient_by_uri',
            {
                data,
                backend_keys: [ this.internalId ],
            }
        )
        // XXXvlab: ``.makeRecipients()`` returns a list that
        // de-duplicate the actual partner data along the multiple
        // backends possible there is a shift of the API to enforce
        // single valued partner data. So here we know it'll return
        // only one recipient.
        return this.makeRecipients(partner)[0]
    }
}


export const Transaction = Record(BridgeObject, {
    date: {
        order: {
            orderFn: (x: any, y: any) => x.getTime() - y.getTime(),
        },
    },
})

