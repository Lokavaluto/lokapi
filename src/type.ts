

export interface IHttpRequest {
    request(opts): Object
}


export type coreHttpOpts = {
    protocol: string
    host: string
    path: string
    method: "GET" | "POST"
    headers?: {}
    data?: {}
}


export type HttpOpts = {
    method: "GET" | "POST"
    headers?: {}
    data?: {}
}


export type Base64Encode = (s: string) => string