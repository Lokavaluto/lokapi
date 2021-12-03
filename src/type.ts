
export const httpMethods = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD'
] as const


export type httpMethod = typeof httpMethods[number]


export type coreHttpOpts = {
    protocol: string
    host: string
    path: string
    method: httpMethod
    headers?: {}
    port?: number
    data?: {}
    responseHeaders?: {[k: string]: any}
}


export type UrlParts = {
    protocol: string
    host: string
    port: number
    path: string
}


export type HttpRequest = (opts: coreHttpOpts) => Object
export type Base64Encode = (s: string) => string


export type restMethod = (
    path: string,
    data?: any,
    headers?: any,
    responseHeaders?: {[k: string]: any}
) => any


export interface JsonData {
    [index: string]: string | number | JsonData | JsonData[]
}


export type HttpOpts = {
    method: httpMethod
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


export interface IPayment extends IBridge {
    amount: number
    date: string
    description: string
    from: string
    id: string
    to: string
}


export interface ITransaction extends IBridge {
    amount: string      // Don't want fancy rounding issues
    currency: string
    date: Date
    description: string
    id: string
    related: string
    relatedUser: {[index: string]: any}
}


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
    transfer(amount: number, description): Promise<IPayment>
}


export interface IAccount extends IBridge {

    getBalance(): Promise<string>
    getSymbol(): Promise<string>

    transfer(recipient: IRecipient,
             amount: number,
             description: string): Promise<IPayment>
}
