import { BridgeObject } from ".."
import { t } from "../.."


export default class RecurrentContract extends BridgeObject {

    get isRecurrentContract() {
        return true
    }

    get id() {
        return this.jsonData.id
    }

    get amount(): string {
        return Number(this.jsonData.amount).toFixed(2)
    }

    get message(): string {
        return this.jsonData.message
    }

    get state(): string {
        return this.jsonData.state
    }

    get creatorWalletUri(): string {
        return this.jsonData.creator_wallet_uri
    }

    get creatorName(): string {
        return this.jsonData.creator_name
    }

    get date(): Date {
        return new Date(this.jsonData.create_date * 1000)
    }

    get isCreator(): boolean {
        return this.creatorWalletUri === this.parent.internalId
    }

    get senderWalletUri(): string {
        return this.jsonData.sender_wallet_uri
    }

    get senderName(): string {
        return this.jsonData.sender_name
    }

    get receiverWalletUri(): string {
        return this.jsonData.receiver_wallet_uri
    }

    get receiverName(): string {
        return this.jsonData.receiver_name
    }

    get isSender(): boolean {
        return this.senderWalletUri === this.parent.internalId
    }

    get isReceiver(): boolean {
        return this.receiverWalletUri === this.parent.internalId
    }

    get related(): string {
        if (this.isSender) {
            return this.receiverName || this.receiverWalletUri
        }
        return this.senderName || this.senderWalletUri
    }

    get description(): string {
        return this.message
    }

    get dateStart(): string | null {
        return this.jsonData.date_start
    }

    get dateEnd(): string | null {
        return this.jsonData.date_end
    }

    get recurringRuleType(): t.RecurringRuleType {
        return this.jsonData.recurring_rule_type
    }

    get recurringInterval(): number {
        return this.jsonData.recurring_interval
    }

    get nextExecutionDate(): string | null {
        return this.jsonData.recurring_next_date
    }

    public async delete(): Promise<boolean> {
        const currencyId = this.parent.getCurrencyId()
        const backendType = this.parent.internalId.split(':')[0]
        const currency_uri = `${backendType}:${currencyId}`

        const res = await this.backends.odoo.$delete(
            "/payment_request_recurrent_contract/delete-payment-request-recurrent-contracts",
            {
                wallet_uri: this.parent.internalId,
                currency_uri: currency_uri,
                payment_request_ids: [this.id],
            }
        )
        return res === true
    }
}
