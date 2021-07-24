import * as t from "../type"

/**
 * Base object to implement common API between data from
 * different backends. It can support multiple backends
 * for one object.
 */
export class BridgeObject {

    // XXXvlab: TODO: define IBackend
    protected backends: { [index: string]: any }
    protected parent: any
    protected jsonData: any   // XXXvlab: will need to put t.JsonData and data validators

    constructor(backends: { [index: string]: any }, parent, jsonData) {
        this.backends = backends
        this.parent = parent
        this.jsonData = jsonData
    }
}


export abstract class BackendAbstract {

    protected backends: { [index: string]: t.IBackend }
    protected jsonData

    protected abstract httpRequest: t.HttpRequest
    protected abstract base64Encode: t.Base64Encode
    protected abstract persistentStore: t.IPersistentStore
    protected abstract requestLogin(): void

    constructor(backends: any, jsonData: any) {
        this.backends = backends
        this.jsonData = jsonData
    }

}

export var BackendFactories = {}

