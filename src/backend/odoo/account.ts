import { BridgeObject } from '..'


export default class Account extends BridgeObject {

    public async getPendingTopUp() {
        let requests = await this.backends.odoo.$get(
            '/partner/pending-topup', {
            backend_keys: [ this.parent.internalId ],
        })
        return await Promise.all(
            requests.map((e: any) => this.parent.makeCreditRequest(e))
        )
    }
}
