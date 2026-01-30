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

    public async createPaymentRequest(
        requests: Array<{
            sender_wallet_uri: string
            receiver_wallet_uri: string
            amount: number
            message?: string
        }>
    ): Promise<number[]> {
        const currencyId = this.getCurrencyId()
        const backendType = this.internalId.split(':')[0]
        const currency_uri = `${backendType}:${currencyId}`

        const res = await this.backends.odoo.$post(
            '/payment_request/create-payment-request',
            {
                currency_uri: currency_uri,
                creator_wallet_uri: this.internalId,
                requests: requests.map(req => ({
                    sender_wallet_uri: req.sender_wallet_uri,
                    receiver_wallet_uri: req.receiver_wallet_uri,
                    amount: req.amount,
                    message: req.message || null,
                })),
            }
        )
        if (!res || !Array.isArray(res)) {
            throw new Error('Failed to create payment request')
        }
        return res
    }

}
