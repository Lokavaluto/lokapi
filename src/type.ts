

export type coreHttpOpts = {
    protocol: string
    host: string
    path: string
    method: string
    headers?: {}
    data?: {}
}


export type HttpRequest = (opts: coreHttpOpts) => Object


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


export interface IRecipient extends IPartner {
    backend: any
    parent: any
}


export interface IPayment {
    backend: any
}


export interface ITransaction {
    backend: any
}


/**
 * Simple output from odoo database
 *
 */
export interface IPartner {
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
}


export type Base64Encode = (s: string) => string