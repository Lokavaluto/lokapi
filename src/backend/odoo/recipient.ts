import { e as httpRequestExc } from '@0k/types-request'

import * as t from '../../type'
import { buildWalletUri, parseUri } from '../../uri'

import { Contact } from './contact'
import UserAccount from './userAccount'


export default abstract class Recipient extends Contact implements t.IRecipient {

    abstract fromUserAccount: UserAccount
    abstract userAccountInternalId: string

    /**
     * Plugin-specific identifier for this recipient's wallet.
     */
    abstract ident: string

    /**
     * Full wallet URI for this recipient.
     *
     * Built from the backend's engine and currency identifier
     * combined with this recipient's ``ident``.
     */
    get walletUri (): string {
        const { engine, currencyIdent } = parseUri(this.parent.uri)
        return buildWalletUri(engine, currencyIdent, this.ident)
    }

    abstract prepareTransfer (
        amount: string,
        senderMemo: string,
        recipientMemo: string,
        signal: AbortSignal,
    ): Promise<t.ITransaction[]>


    /**
     * Update account on both administrative and financial backends.
     *
     * The accountData structure is opaque at this level and
     * defined by the financial backend implementation.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Promise<any>
     */
    public async updateAccount (accountData: any): Promise<any> {
        const financialResult =
            await this.updateAccountForFinancialBackend(accountData)
        await this.updateAccountForAdministrativeBackend(accountData)
        return financialResult
    }


    /**
     * Update account on the administrative backend via the LCC API
     * ``POST /wallet/<ident>/update`` endpoint.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Promise<any>
     */
    public async updateAccountForAdministrativeBackend (
        accountData: any,
    ): Promise<any> {
        return this.fromUserAccount.lccApi.$post(
            `/wallet/${this.ident}/update`,
            { data: accountData },
            'wallet/0',
        )
    }


    /**
     * Update account on the financial backend. Override in
     * backend-specific implementations.
     */
    public async updateAccountForFinancialBackend (
        accountData: any,
    ): Promise<any> {
        throw new Error('updateAccountForFinancialBackend not implemented for this backend')
    }


    /**
     * Request if administrative backend allows current account to
     * transfer to given recipient account.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @param recipient The recipient to which we check if transfer is allowed
     *
     * @returns boolean
     */
    public async isTransferAllowedByAdministrativeBackend (): Promise<Boolean> {
        try {
            return await this.backends.odoo.$get('/partner/is_transaction_allowed', {
                sender_wallet_ident: this.fromUserAccount.internalId,
                recipient_wallet_ident: this.userAccountInternalId
            })
        } catch(err) {
            if (err instanceof httpRequestExc.HttpError && err.code === 404) {
                // We want to support server without this feature
                return true
            }
            throw err
        }
    }
}
