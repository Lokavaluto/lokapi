import * as t from '../../type'

import { Contact } from './contact'
import UserAccount from './userAccount'


export default abstract class Recipient extends Contact {

    abstract fromUserAccount: UserAccount
    abstract walletInternalId: string

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
        debugger
        const backendType = this.backendId.split(":")[0]
        return await this.backends.odoo.$get('/partner/is_transaction_allowed', {
            sender_wallet_ident: this.fromUserAccount.internalId,
            recipient_wallet_ident: this.walletInternalId
        })
    }

}
