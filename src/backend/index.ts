
/**
 * Base object to implement common API between data from
 * different backends.
 */
export class BridgeObject {

    // XXXvlab: TODO: define IBackend
    backend: any

    jsonData: any

    constructor(backend, jsonData) {
        this.backend = backend
        this.jsonData = jsonData
    }
}


export var BackendFactories = {}

