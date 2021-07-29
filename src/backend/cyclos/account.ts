import * as t from "../../type"

import { CyclosRecipient } from "./recipient"

import { BridgeObject } from ".."


export class CyclosAccount extends BridgeObject implements t.IAccount {

    async getBalance() {
        return this.jsonData.cyclos.status.balance
    }

    async getSymbol() {
        return this.jsonData.cyclos.currency.symbol
    }

    get internalId() {
        return `${this.parent.internalId}/${this.parent.owner_id}/${this.jsonData.cyclos.id}`
    }

    public async transfer(recipient: CyclosRecipient, amount: number, description: string) {
        // On cyclos, account transfer is managed through the owner account
        return recipient.transfer(amount, description)
    }


    /**
     * get URL to Credit given amount on current account
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async getCreditUrl(amount: number): Promise<string> {
        return this.backends.odoo.$post('/cyclos/credit', {
            owner_id: this.parent.ownerId,
            amount,
        })
    }

}
