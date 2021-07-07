
import { JsonRESTSessionClientAbstract } from "../../rest"

import { CyclosAccount } from "./account"

import { BackendFactories } from ".."


export abstract class CyclosBackendAbstract extends JsonRESTSessionClientAbstract {

    AUTH_HEADER = "Session-token"

    owner_id: string


    constructor(jsonData) {
        super(jsonData.server_url)
        this.apiToken = jsonData.token
        this.owner_id = jsonData.owner_id
    }


    async getAccounts() {
        let jsonAccounts = await this.$get(`/${this.owner_id}/accounts`)

        let accounts = []

        jsonAccounts.forEach((jsonAccountData: any) => {
            accounts.push(new CyclosAccount(this, jsonAccountData))
        })
        return accounts
    }

}


BackendFactories['cyclos'] = CyclosBackendAbstract