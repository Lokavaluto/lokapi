import { t as httpRequestType } from '@0k/types-request'



export type UrlParts = {
    protocol: string
    host: string
    port: number
    path: string
}


export type Base64Encode = (s: string) => string


export type restMethod = (
    path: string,
    data?: any,
    headers?: any,
    responseHeaders?: {[k: string]: any}
) => any


export interface JsonData {
    [index: string]: boolean | string | number | JsonData | JsonData[]
}


export type HttpOpts = {
    method: httpRequestType.httpMethod
    headers?: {}
    data?: JsonData | [string, JsonData][]
    responseHeaders?: {[k: string]: any}
}


export interface IPersistentStore {
    get(key: string, defaultValue?: string): string
    set(key: string, value: string): void
    del(key: string): void
}


export interface IBackend {
    [index: string]: any
}


/**
 * Bridge objects represent object in one or multiple
 * backends.
 */

export interface IBridge {
}


export interface ITransaction extends IBridge {
    amount: string      // Don't want fancy rounding issues
    currency: string
    date: Date
    description: string
    id: string
    related: string
}


export interface ICreditRequest extends ITransaction {}


export interface IContact extends IBridge {

    /**
     * Odoo partner fields
     */

    id: number
    name: string
    email: string
    is_favorite: boolean
    is_company: boolean
    mobile: string
    phone: string
    street: string
    street2: string
    zip: string

    setFavorite(): Promise<void>
    unsetFavorite(): Promise<void>
    toggleFavorite(): Promise<void>

}


export interface IRecipient extends IContact {
    transfer(amount: number,
             senderMemo: string,
             recipientMemo: string): Promise<ITransaction>
}


export interface IAccount extends IBridge {

    getBalance(): Promise<string>
    getSymbol(): Promise<string>

    transfer(recipient: IRecipient,
             amount: number,
             senderMemo: string,
             recipientMemo: string): Promise<ITransaction>
}


export interface ITransactionOptions {
    dateBegin?: Date
    dateEnd?: Date
    order?: Array<string>
}
