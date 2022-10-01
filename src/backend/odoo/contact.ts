import * as t from '../../type'

import { BridgeObject } from '..'


export class Contact extends BridgeObject implements t.IContact {

    get name () {
        return this.jsonData.odoo.name
    }

    get city () {
        return this.jsonData.odoo.city
    }

    get email () {
        return this.jsonData.odoo.email
    }

    get id () {
        return this.jsonData.odoo.id
    }

    get is_company () {
        return this.jsonData.odoo.is_company
    }

    get is_favorite () {
        return this.jsonData.odoo.is_favorite
    }


    set is_favorite (value) {
        this.jsonData.odoo.is_favorite = value
    }

    get mobile () {
        return this.jsonData.odoo.mobile
    }

    get phone () {
        return this.jsonData.odoo.phone
    }

    get street () {
        return this.jsonData.odoo.street
    }

    get street2 () {
        return this.jsonData.odoo.street2
    }

    get zip () {
        return this.jsonData.odoo.zip
    }


    /**
     * Set favorite status of current Contact for current logged in account
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async setFavorite (): Promise<void> {
        await this.backends.odoo.$put(
            `/partner/${this.jsonData.odoo.id}/favorite/set`
        )
        this.jsonData.odoo.is_favorite = true
    }


    /**
     * Unset favorite status of current Contact for current logged in account
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @returns Object
     */
    public async unsetFavorite (): Promise<void> {
        await this.backends.odoo.$put(
            `/partner/${this.jsonData.odoo.id}/favorite/unset`
        )
        this.jsonData.odoo.is_favorite = false
    }


    /**
     * Unset favorite status of current Contact for current logged in account
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     *
     * @param contact The contact to toggle favorite status
     *
     * @returns Object
     */
    public async toggleFavorite (): Promise<void> {
        if (this.is_favorite) return this.unsetFavorite()
        return this.setFavorite()
    }

}
