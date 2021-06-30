
import { JsonRESTClient } from "../../rest"

import { CyclosAccount } from "./account"

import { BackendFactories } from ".."


export class CyclosBackend extends JsonRESTClient {

    owner_id: string

    mixin: any

    constructor(accountData, mixin) {
        super(accountData.server_url, mixin)
        this.authHeaders = { "Session-token": accountData.cyclos_token }
        this.owner_id = accountData.cyclos_id
    }


    get accounts() {
        return (async () => {
            let jsonAccounts = await this._authReq(`/api/${this.owner_id}/accounts`, {
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