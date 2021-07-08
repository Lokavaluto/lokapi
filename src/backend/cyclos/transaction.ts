import * as t from "../../type"

import { BridgeObject } from ".."


export class CyclosTransaction extends BridgeObject implements t.ITransaction {

    get amount() {
        return this.jsonData.amount
    }
    get currency() {
        return this.jsonData.currency
    }
    get date() {
        return this.jsonData.date
    }
    get description() {
        return this.jsonData.description
    }
    get id() {
        return this.jsonData.id
    }
    get kind() {
        return this.jsonData.kind
    }
    get related() {
        return this.jsonData.related
    }
    get relatedKind() {
        return this.jsonData.relatedKind
    }
    get relatedUser() {
        return this.jsonData.relatedUser
    }

}
