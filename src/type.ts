

export type coreHttpOpts = {
    protocol: string
    host: string
    path: string
    method: "GET" | "POST"
    headers?: {}
    data?: {}
}


export type HttpRequest = (opts: coreHttpOpts) => Object


export type HttpOpts = {
    method: "GET" | "POST"
    headers?: {}
    data?: {}
}


export type Base64Encode = (s: string) => string