import { BridgeObject } from ".."


export class CyclosAccount extends BridgeObject {

    get balance() {
        return this.jsonData.status.balance
    }

    get symbol() {
        return this.jsonData.currency.symbol
    }
}
