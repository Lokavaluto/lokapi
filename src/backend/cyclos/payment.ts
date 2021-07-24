import * as t from "../../type"

import { BridgeObject } from ".."


export class CyclosPayment extends BridgeObject implements t.IPayment {

    get amount() {
        return this.jsonData.cyclos.amount
    }
    get date() {
        return this.jsonData.cyclos.date
    }
    get description() {
        return this.jsonData.cyclos.description
    }
    get from() {
        return this.jsonData.cyclos.from
    }
    get id() {
        return this.jsonData.cyclos.id
    }
    get to() {
        return this.jsonData.cyclos.to
    }

}
