import { BridgeObject } from ".."


export default class PaymentRequest extends BridgeObject {

    get isPaymentRequest() {
        return true
    }

    get id() {
        return this.jsonData.id
    }

    get amount() {
        // Format amount with 2 decimal places (e.g., 40 -> "40.00")
        return Number(this.jsonData.amount).toFixed(2)
    }

    get message() {
        return this.jsonData.message
    }

    get state() {
        return this.jsonData.state
    }

    get creatorWalletUri() {
        return this.jsonData.creator_wallet_uri
    }

    get creatorName() {
        return this.jsonData.creator_name
    }

    get date() {
        return new Date(this.jsonData.create_date * 1000)
    }

    get isCreator() {
        return this.creatorWalletUri === this.parent.internalId
    }

    get senderWalletUri() {
        return this.jsonData.sender_wallet_uri
    }

    get receiverWalletUri() {
        return this.jsonData.receiver_wallet_uri
    }

    get isSender() {
        return this.senderWalletUri === this.parent.internalId
    }

    get isReceiver() {
        return this.receiverWalletUri === this.parent.internalId
    }

    get related() {
        // Si je suis le sender, afficher le receiver, sinon afficher le sender
        if (this.isSender) {
            return this.jsonData.receiver_name || this.receiverWalletUri
        }
        return this.jsonData.sender_name || this.senderWalletUri
    }

    get description() {
        return this.message
    }

    public async cancel(reason?: string) {
        return this._updateStatus("cancelled", reason)
    }

    public async refuse(reason: string) {
        return this._updateStatus("refused", reason)
    }

    public async markAsPaid(txId: string) {
        return this._updateStatus("paid", txId)
    }

    private async _updateStatus(status: string, message?: string) {
        const currencyId = this.parent.getCurrencyId()
        const backendType = this.parent.internalId.split(':')[0]
        const currency_uri = `${backendType}:${currencyId}`

        const res = await this.backends.odoo.$post(
            "/payment_request/update-payment-request",
            {
                wallet_uri: this.parent.internalId,
                currency_uri: currency_uri,
                payment_request_id: this.id,
                status,
                message,
            }
        )
        if (!res) {
            throw new Error(
                `Failed to update payment request status to ${status}`
            )
        }
        return
    }
}
