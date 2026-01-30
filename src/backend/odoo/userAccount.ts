import { BridgeObject } from '..'
import { t } from '../..'
import PaymentRequest from './paymentRequest'


export default abstract class UserAccount extends BridgeObject {

    abstract internalId: string
    abstract getAccounts(): Promise<any[]>
    abstract getCurrencyId(): string

    get isTopUpAllowed() {
        return this.jsonData?.is_topup_allowed !== false
    }

    /**
     * Get payment requests for this user account (wallet)
     *
     * @param state - Array of states to filter (e.g. ["open"], ["paid", "refused"])
     *
     * @returns Array of PaymentRequest objects
     */
    public async getPaymentRequests(state: string[]): Promise<t.IPaymentRequest[]> {
        const currencyId = this.getCurrencyId()
        const backendType = this.internalId.split(':')[0]
        const currency_uri = `${backendType}:${currencyId}`

        const requests = await this.backends.odoo.$get(
            '/payment_request/list-payment-requests',
            {
                wallet_uri: this.internalId,
                currency_uri: currency_uri,
                state: state,
            }
        )
        return requests.map((e: any) => new PaymentRequest(this.backends, this, e))
    }

}
