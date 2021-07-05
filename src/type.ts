

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


export type Base64Encode = (s: string) => string