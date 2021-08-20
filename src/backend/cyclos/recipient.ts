import * as t from '../../type'

import { Contact } from '../odoo/contact'
import { CyclosPayment } from './payment'


export class CyclosRecipient extends Contact implements t.IRecipient {

    public async transfer (amount: number, description: string) {
        const jsonDataPerform = await this.backends.cyclos.$get(
            '/self/payments/data-for-perform',
            {
                to: this.jsonData.cyclos.owner_id,
            }
        )
        if (!jsonDataPerform.paymentTypes) {
            throw new Error('Unexpected data: no "PaymentTypes" in response.')
        }
        if (!(jsonDataPerform.paymentTypes instanceof Array)) {
            throw new Error('Unexpected data: no "PaymentTypes" data.')
        }
        if (jsonDataPerform.paymentTypes.length === 0) {
            throw new Error(
                'No payment types available between selected accounts'
            )
        }
        if (jsonDataPerform.paymentTypes.length > 1) {
            throw new Error(
                'More than one payment types available between ' +
                    'selected accounts. Not supported yet !'
            )
        }
        const jsonData = await this.backends.cyclos.$post('/self/payments', {
            amount: amount,
            description: description,
            subject: this.jsonData.cyclos.owner_id,
        })
        return new CyclosPayment({ cyclos: this.backends.cyclos }, this, {
            cyclos: jsonData,
        })
    }

    get internalId () {
        return `${this.parent.internalId}/${this.backends.cyclos.owner_id}`
    }

}
