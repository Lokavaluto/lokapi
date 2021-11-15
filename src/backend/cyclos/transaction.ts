import * as t from '../../type'

import { BridgeObject } from '..'


export class CyclosTransaction extends BridgeObject implements t.ITransaction {

    get amount () {
        return this.jsonData.cyclos.amount
    }

    get currency () {
        return this.jsonData.cyclos.currency
    }

    get date () {
        return new Date(this.jsonData.cyclos.date)
    }

    get description () {
        return this.jsonData.cyclos.description
    }

    get id () {
        return this.jsonData.cyclos.id
    }

    get related () {
        return this.jsonData.cyclos.related
    }

    get relatedUser () {
        return this.jsonData.cyclos.relatedUser
    }

}
