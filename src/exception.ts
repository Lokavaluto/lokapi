
// Exceptions

export class RequestFailed extends Error {
    constructor (message: string) {
        super(message)
        this.name = this.constructor.name
    }
}


export class APIRequestFailed extends Error {
    constructor (message: string) {
        super(message)
        this.name = this.constructor.name
    }
}


export class InvalidConnectionDetails extends Error {
    constructor (message: string) {
        super(message)
        this.name = this.constructor.name
    }
}


export class InvalidCredentials extends Error {
    constructor (message: string) {
        super(message)
        this.name = this.constructor.name
    }
}


export class HttpError extends Error {
    code: number
    data: string
    response: any
    constructor (code: number, message: string, data: string, response: any) {
        super(message)
        this.code = code
        this.data = data
        this.response = response
        this.name = this.constructor.name
    }
}


export class InvalidJson extends Error {
    constructor (message: string) {
        super(message)
        this.name = this.constructor.name
    }
}


export class AuthenticationRequired extends Error {
    constructor (message: string) {
        super(message)
        this.name = this.constructor.name
    }
}

