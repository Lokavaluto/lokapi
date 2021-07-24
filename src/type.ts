

export type coreHttpOpts = {
    protocol: string
    host: string
    path: string
    method: string
    headers?: {}
    port?: number
    data?: {}
}


export type HttpRequest = (opts: coreHttpOpts) => Object
export type Base64Encode = (s: string) => string

export type restMethod = (path: string, data?: any, headers?: any) => any


export type HttpOpts = {
    method: string
    headers?: {}
    data?: {}
}

export interface IPersistentStore {
    get(key: string, defaultValue?: string): string
    set(key: string, value: string): void
    del(key: string): void
}


export interface JsonData { [index: string]: string | number | JsonData | JsonData[] }


export interface IBackend {

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
    amount: number
    currency: string
    date: string
    description: string
    id: string
    kind: string
    related: string
    relatedKind: string
    relatedUser: string
}


export interface IAccount extends IBridge {

    getBalance(): Promise<string>
    getSymbol(): Promise<string>

    transfer(recipient: IRecipient, amount: number, description: string): Promise<IPayment>
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



