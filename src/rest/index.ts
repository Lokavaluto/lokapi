import * as e from "./exception"
import * as t from "../type"
import { stringify as toQueryString } from "query-string"


export abstract class JsonRESTClientAbstract {

    protocol: string = ""
    host: string = ""
    path: string = ""
    port: number

    protected abstract httpRequest: t.HttpRequest
    protected abstract base64Encode: t.Base64Encode

    // Constants

    COMMON_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


    authHeaders: any

    /**
     * Adds headers that are intended to be sent in each authenticated
     * call. Setting to 'null' or 'false' or empty string will remove
     * the header.
     *
     * @param name   Header name
     * @param value  Value to be set to given header
     *
     * @returns void
     */
    setAuthHeader(name: string, value: string) {
        if (value) {
            this.authHeaders[name] = value
        } else {
            delete this.authHeaders[name]
        }
    }


    constructor(host_or_url: string) {
        if (host_or_url.includes("://")) {
            [this.protocol, host_or_url] = host_or_url.split("://")
        } else {
            this.protocol = "https"
            this.port = 443
            host_or_url = host_or_url.replace(/\/$/, '')
        }
        if (host_or_url.includes("/")) {
            const splits = host_or_url.split("/");
            [this.host, this.path] = [splits[0], "/" + splits.slice(1).join("/")]
        } else {  // assume host only
            this.path = ""
            this.host = host_or_url
        }
        if (this.host.includes(":")) {
            const splits = this.host.split(":");
            if (splits.length > 2) {
                throw new e.InvalidConnectionDetails(`Too many ':' to get host and port: ${this.host}`)
            }
            [this.host, this.port] = [splits[0], parseInt(splits[1])]

        } else {
            if (this.protocol === "http") {
                this.port = 80
            } else if (this.protocol === "https") {
                this.port = 443
            } else {
                this.port = 0
            }
        }
        this.authHeaders = {}
    }

    public async request(path: string, opts: t.HttpOpts): Promise<any> {
        let headers = Object.assign({}, this.COMMON_HEADERS, opts.headers)
        let rawData: any
        let qs = ""
        if (opts.method === "GET" && Object.keys(opts.data).length != 0) {
            qs = toQueryString(opts.data, { arrayFormat: 'index' })
        }
        try {
            rawData = await this.httpRequest({
                protocol: this.protocol,
                host: this.host,
                path: `${this.path}/${path.replace(/^\//, '')}` + (qs ? `?${qs}` : ""),
                headers: headers,
                method: opts.method,
                ...!qs && { data: opts.data },
                ...this.port && { port: this.port },
            })
        } catch (err) {
            console.log(`Failed ${opts.method} request to ${path} (Host: ${this.host})`)
            throw err
        }
        let parsedData: any
        try {
            parsedData = JSON.parse(rawData);
        } catch (err) {
            const printableData = rawData.length > 200 ? `${rawData.slice(0, 200)}..` : rawData
            throw new e.InvalidJson(`Data is not parseable JSON: ${printableData}`)
        }
        return parsedData
    }


    protected requireAuth(): void {
        if (Object.keys(this.authHeaders).length == 0) {
            throw new e.AuthenticationRequired("Authentication required")
        }
    }

    public async authRequest(path: string, opts: t.HttpOpts): Promise<any> {
        this.requireAuth()
        opts.headers = Object.assign({}, this.authHeaders, opts.headers)
        return this.request(path, opts)
    }


    // Make typescript happy

    get: t.restMethod
    post: t.restMethod
    delete: t.restMethod
    put: t.restMethod

    $get: t.restMethod
    $post: t.restMethod
    $delete: t.restMethod
    $put: t.restMethod

}


let METHODS = "get post put delete"

METHODS.split(" ").forEach(method => {
    JsonRESTClientAbstract.prototype[method] = async function(
        path: string, data?: any, headers?: any) {
        let opts: t.HttpOpts = {
            method: method.toUpperCase(),
            headers: headers || {},
            data: data || {},
        }
        return this.request(path, opts)
    }

    JsonRESTClientAbstract.prototype["$" + method] = async function(
        path: string, data?: any, headers?: any) {
        let opts: t.HttpOpts = {
            method: method.toUpperCase(),
            headers: headers || {},
            data: data || {},
        }
        return this.authRequest(path, opts)
    }
})


export abstract class JsonRESTSessionClientAbstract extends JsonRESTClientAbstract {

    abstract AUTH_HEADER: string

    private _apiToken: string
    get apiToken(): string {
        return this._apiToken
    }

    set apiToken(value: string) {
        this._apiToken = value
        this.onSetToken(value)
    }


    /**
     * Provides an overriding mechanism to subclass to eventually
     * change, or add behavior upon receiving new token
     *
     * @param apiToken  The new token string that was set.
     */
    protected onSetToken(apiToken: string) {
        this.setAuthHeader(this.AUTH_HEADER, apiToken)
    }


    // Abstract classes implementation do not allow to play well with
    // implemented properties. We need this to avoid having issues when
    // setting token in constructors.
    protected lazySetApiToken(value) {
        this._apiToken = value
    }

    protected requireAuth(): void {
        if (Object.keys(this.authHeaders).length == 0) {
            let apiToken = this.apiToken
            if (apiToken) {
                this.onSetToken(apiToken)
            } else {
                throw new e.AuthenticationRequired("Authentication required: No token set")
            }
        }
    }

}


export abstract class JsonRESTPersistentClientAbstract extends JsonRESTSessionClientAbstract {

    protected abstract internalId: string
    protected abstract persistentStore: t.IPersistentStore
    protected abstract requestLogin(): void


    /**
     * Provide an id for the client that can be used in URL without
     * any character that needs encoding. Used in IPersistentStore
     * to lower down constraints on these stores.
     */
    private get simpleId(): string {
        return this.base64Encode(this.internalId).replace(/=/g, "")
    }

    /**
     * Provides an overriding mechanism to subclass to eventually
     * change, or add behavior upon receiving new token
     *
     * @param apiToken  The new token string that was set.
     */
    protected onSetToken(apiToken: string) {
        super.onSetToken(apiToken)
        if (!!apiToken) {
            this.persistentStore.set(`token_${this.simpleId}`, apiToken)
        } else {
            this.persistentStore.del(`token_${this.simpleId}`)
        }
    }

    protected requireAuth(): void {
        if (!this.apiToken) {
            let persistentToken = this.persistentStore.get(`token_${this.simpleId}`, null)
            if (persistentToken) {
                super.apiToken = persistentToken
            }
        }
        super.requireAuth()
    }

    public async authRequest(path: string, opts: t.HttpOpts): Promise<any> {
        try {
            return await super.authRequest(path, opts)
        } catch (err) {
            // XXXvlab: err instanceof e.AuthenticationRequired is giving false
            // despite it seeming to be perfectly valid.
            //if (err instanceof e.AuthenticationRequired) {
            if (err.constructor.name === "AuthenticationRequired") {
                this.apiToken = null
                if (!!this.requestLogin) {
                    this.requestLogin()
                }
            }
            throw err
        }
    }

    /**
     * Log out from server. Keep it async in case we have requests to do.
     *
     * @returns void
     *
     */
    async logout(): Promise<void> {
        this.apiToken = null
    }

}