import * as t from '../../type'

import { BridgeObject } from '..'

export default class CreditRequest extends BridgeObject {
       get amount() {
        return this.jsonData.odoo.amount.toString()
    }
       get date() {
        return new Date(1000 * this.jsonData.odoo.date)
    }

    get description() {
        return ""
    }

     get related() {
        return this.jsonData.odoo.name
    }

    get backendId() {
        return this.parent.internalId
    }

    get paid() {
        return this.jsonData.odoo.paid
    }

    public async cancel() {
        // XXXvlab: yuck, there need to be a clean up and rationalisation
        //   of these backends and jsonData link madness

        const { order_id } = this.jsonData.odoo
        const res = await this.backends.odoo.$post(
            "/partner/remove-pending-topup",
            { order_id }
        )
        if (!res) {
            throw new Error(
                `Admin backend refused the removal of top-up request`
            )
        }

        return
    }
}
