import { BridgeObject } from ".."


export class CyclosAccount extends BridgeObject {

    async getBalance() {
        return this.jsonData.status.balance
    }

    async getSymbol() {
        return this.jsonData.currency.symbol
    }
}
