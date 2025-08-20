import { e as httpRequestExc } from '@0k/types-request'

import * as t from '../../type'

import { Contact } from './contact'
import UserAccount from './userAccount'


export default abstract class Recipient extends Contact implements t.IRecipient {

    abstract fromUserAccount: UserAccount
    abstract userAccountInternalId: string

    abstract prepareTransfer (
        amount: string,
        senderMemo: string,
        recipientMemo: string,
        signal: AbortSignal,
    ): Promise<t.ITransaction[]>

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
