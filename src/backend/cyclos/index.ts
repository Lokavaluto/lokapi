
import { JsonRESTPersistentClientAbstract } from "../../rest"
import * as t from "../../type"

import { CyclosAccount } from "./account"
import { CyclosRecipient } from "./recipient"
import { CyclosTransaction } from "./transaction"

import { BackendFactories, BackendAbstract } from ".."

interface IJsonDataWithOwner extends t.JsonData {
    owner_id: string
}


export abstract class CyclosBackendAbstract extends BackendAbstract {

    private getSubBackend(jsonData: IJsonDataWithOwner) {
        let { httpRequest, base64Encode, persistentStore, requestLogin } = this
        class CyclosUserAccount extends CyclosUserAccountAbstract {
            httpRequest = httpRequest
            base64Encode = base64Encode
            persistentStore = persistentStore
            requestLogin = requestLogin

            // This function declaration seems necessary for typescript
            // to avoid having issues with this dynamic abstract class
            constructor(backends: { [index: string]: t.IBackend }, jsonData: IJsonDataWithOwner) {
                super(backends, jsonData)
            }
        }
        return new CyclosUserAccount(this.backends, jsonData)
    }

    private get userAccounts() {
        if (!this._userAccounts) {
            this._userAccounts = {}
            this.jsonData.user_accounts.forEach((userAccountData: IJsonDataWithOwner) => {
                let cyclosUserAccount = this.getSubBackend(userAccountData)
                this._userAccounts[cyclosUserAccount.internalId] = cyclosUserAccount
            })
        }
        return this._userAccounts
    }
    private _userAccounts: any


    public async getAccounts(): Promise<any> {
        let backendBankAccounts = []
        for (const id in this.userAccounts) {
            let userAccount = this.userAccounts[id]
            let bankAccounts = await userAccount.getAccounts()
            bankAccounts.forEach((bankAccount: any) => {
                backendBankAccounts.push(bankAccount)
            })
        }
        return backendBankAccounts
    }


    public makeRecipients(jsonData: t.JsonData): t.IRecipient[] {
        let recipients = []
        if (Object.keys(this.userAccounts).length === 0) {
            throw new Error("Current user as no account in cyclos. Unsupported yet.")
        }
        if (Object.keys(this.userAccounts).length > 1) {
            // We will need to select one of the source userAccount of the
            // current logged in user
            throw new Error("Current user as more than one account in cyclos. Unsupported yet.")
        }
        jsonData.monujo_backends[this.internalId].forEach((ownerId: string) => {
            // Each ownerId here is a different account in cyclos for recipient
            recipients.push(new CyclosRecipient(
                {
                    cyclos: Object.values(this.userAccounts)[0],
                    ...this.backends
                },
                this,
                {
                    odoo: jsonData,
                    cyclos: { owner_id: ownerId }
                }
            ))
        })
        return recipients
    }


    get internalId() {
        let endingPart = this.jsonData.user_accounts[0].url.split("://")[1];
        let splits = endingPart.split("/");
        let host = splits[0]
        return `cyclos:${host}`
    }


    public async getTransactions(): Promise<any> {
        let backendTransactions = []
        for (const id in this.userAccounts) {
            let userAccount = this.userAccounts[id]
            // XXXvlab: these promises should be awaited in parallel
            let transactions = await userAccount.getTransactions()
            transactions.forEach((transaction: any) => {
                backendTransactions.push(transaction)
            })
        }
        return backendTransactions
    }

}



export abstract class CyclosUserAccountAbstract extends JsonRESTPersistentClientAbstract {

    AUTH_HEADER = "Session-token"

    ownerId: string
    backends: { [index: string]: t.IBackend }

    constructor(backends, jsonData) {
        super(jsonData.url)
        this.lazySetApiToken(jsonData.token)
        this.ownerId = jsonData.owner_id
        this.backends = backends
    }

    async getAccounts() {
        let jsonAccounts = await this.$get(`/${this.ownerId}/accounts`)
        let accounts = []
        jsonAccounts.forEach((jsonAccountData: any) => {
            accounts.push(new CyclosAccount(
                { cyclos: this, ...this.backends },
                this,
                { cyclos: jsonAccountData }))
        })
        return accounts
    }

    get internalId() {
        return `cyclos:${this.ownerId}@${this.host}`
    }

    public async getTransactions(): Promise<any> {
        let jsonTransactions = await this.$get(`/${this.ownerId}/transactions`)
        let transactions = []
        jsonTransactions.forEach((jsonTransactionData: any) => {
            transactions.push(new CyclosTransaction(
                { 'cyclos': this, ...this.backends },
                this,
                { 'cyclos': jsonTransactionData }
            ))
        })
        return transactions
    }
}


BackendFactories['cyclos'] = CyclosBackendAbstract