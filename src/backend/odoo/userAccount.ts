import { BridgeObject } from '..'
import { t } from '../..'
import PaymentRequest from './paymentRequest'
import RecurrentContract from './recurrentContract'


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

    public async getRecurrentContracts(state: string[]): Promise<t.IRecurrentContract[]> {
        const currencyId = this.getCurrencyId()
        const backendType = this.internalId.split(':')[0]
        const currency_uri = `${backendType}:${currencyId}`

        const contracts = await this.backends.odoo.$get(
            '/payment_request_recurrent_contract/list-payment-request-recurrent-contracts',
            {
                wallet_uri: this.internalId,
                currency_uri: currency_uri,
                state: state,
            }
        )
        return contracts.map((e: any) => new RecurrentContract(this.backends, this, e))
    }

    public async createRecurrentContract(
        contracts: Array<{
            sender_wallet_uri: string
            receiver_wallet_uri: string
            amount: number
            message?: string
            date_start: string
            date_end?: string
            recurring_rule_type: t.RecurringRuleType
            recurring_interval: number
        }>
    ): Promise<number[]> {
        const currencyId = this.getCurrencyId()
        const backendType = this.internalId.split(':')[0]
        const currency_uri = `${backendType}:${currencyId}`

        const res = await this.backends.odoo.$post(
            '/payment_request_recurrent_contract/create-payment-request-recurrent-contract',
            {
                currency_uri: currency_uri,
                creator_wallet_uri: this.internalId,
                contracts: contracts.map(contract => ({
                    sender_wallet_uri: contract.sender_wallet_uri,
                    receiver_wallet_uri: contract.receiver_wallet_uri,
                    amount: contract.amount,
                    message: contract.message || null,
                    date_start: contract.date_start,
                    date_end: contract.date_end || null,
                    recurring_rule_type: contract.recurring_rule_type,
                    recurring_interval: contract.recurring_interval,
                })),
            }
        )
        if (!res || !Array.isArray(res)) {
            throw new Error('Failed to create recurrent contract')
        }
        return res
    }

}
