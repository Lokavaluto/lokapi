import * as t from "../../type"

import { BridgeObject } from ".."


export class CyclosRecipient extends BridgeObject implements t.IRecipient {

    ownerId: string

    constructor(backend, parent, jsonData, ownerId) {
        super(backend, parent, jsonData)
        this.ownerId = ownerId
    }


    get name() {
        return this.jsonData.name
    }

    get city() {
        return this.jsonData.city
    }

    get email() {
        return this.jsonData.email
    }

    get id() {
        return this.jsonData.id
    }

    get is_company() {
        return this.jsonData.is_company
    }

    get is_favorite() {
        return this.jsonData.is_favorite
    }

    get mobile() {
        return this.jsonData.mobile
    }

    get phone() {
        return this.jsonData.phone
    }

    get street() {
        return this.jsonData.street
    }

    get street2() {
        return this.jsonData.street2
    }

    get zip() {
        return this.jsonData.zip
    }


    get internalId() {
        return `${this.parent.internalId}/${this.ownerId}`
    }

}
