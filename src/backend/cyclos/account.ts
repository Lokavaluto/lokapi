
import { CyclosRecipient } from "./recipient"

import { BridgeObject } from ".."


export class CyclosAccount extends BridgeObject {

    async getBalance() {
        return this.jsonData.status.balance
    }

    async getSymbol() {
        return this.jsonData.currency.symbol
    }

    get internalId() {
        return `${this.parent.internalId}/${this.parent.owner_id}/${this.jsonData.id}`
    }

    public async transfer(recipient: CyclosRecipient, amount: number, description: string) {
        // On cyclos, account transfer is managed through the owner account
        return this.parent.transfer(recipient, amount, description)
    }

}
