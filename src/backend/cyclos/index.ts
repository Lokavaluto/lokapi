
import { JsonRESTClientAbstract } from "../../rest"

import { CyclosAccount } from "./account"

import { BackendFactories } from ".."


export abstract class CyclosBackendAbstract extends JsonRESTClientAbstract {

    owner_id: string

    constructor(accountData) {
        super(accountData.server_url)
        this.authHeaders = { "Session-token": accountData.token }
        this.owner_id = accountData.owner_id
    }


    get accounts() {
        return (async () => {
            let jsonAccounts = await this.$get(`/${this.owner_id}/accounts`)

            let accounts = []

            jsonAccounts.forEach(jsonAccountData => {
                accounts.push(new CyclosAccount(this, jsonAccountData))
            })
            return accounts
        })()
    }

}


BackendFactories['cyclos'] = CyclosBackendAbstract