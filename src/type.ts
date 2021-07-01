

export type coreHttpOpts = {
    protocol: string
    host: string
    path: string
    method: string
    headers?: {}
    data?: {}
}


export type HttpRequest = (opts: coreHttpOpts) => Object


export type HttpOpts = {
    method: string
    headers?: {}
    data?: {}
}


export type Base64Encode = (s: string) => string