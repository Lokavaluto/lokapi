
import { JsonRESTClient } from "../../rest"

import { CyclosAccount } from "./account"

import { BackendFactories } from ".."


export class CyclosBackend extends JsonRESTClient {

    owner_id: string

    mixin: any

    constructor(accountData, mixin) {
        super(accountData.server_url, mixin)
        this.authHeaders = { "Session-token": accountData.token }
        this.owner_id = accountData.owner_id
    }


    get accounts() {
        return (async () => {
            let jsonAccounts = await this._authReq(`/${this.owner_id}/accounts`, {
                method: "GET",
            })

            let accounts = []

            jsonAccounts.forEach(jsonAccountData => {
                accounts.push(new CyclosAccount(this, jsonAccountData))
            })
            return accounts
        })()
    }

}


BackendFactories['cyclos'] = CyclosBackend