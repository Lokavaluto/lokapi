import * as t from "../../type"

import { BridgeObject } from ".."


export class CyclosPayment extends BridgeObject implements t.IPayment {

    get amount() {
        return this.jsonData.amount
    }
    get date() {
        return this.jsonData.date
    }
    get description() {
        return this.jsonData.description
    }
    get from() {
        return this.jsonData.from
    }
    get id() {
        return this.jsonData.id
    }
    get to() {
        return this.jsonData.to
    }

}
