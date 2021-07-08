
/**
 * Base object to implement common API between data from
 * different backends.
 */
export class BridgeObject {

    // XXXvlab: TODO: define IBackend
    backend: any
    parent: any
    jsonData: any

    constructor(backend, parent, jsonData) {
        this.backend = backend
        this.parent = parent
        this.jsonData = jsonData
    }
}


export var BackendFactories = {}

