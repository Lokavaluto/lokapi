
export class RequestFailed extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'RequestFailed'
    }
}


export class APIRequestFailed extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'APIRequestFailed'
    }
}


export class InvalidConnectionDetails extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'InvalidConnectionDetails'
    }
}


export class InvalidCredentials extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'InvalidCredentials'
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
        this.name = 'HttpError'
    }
}


export class InvalidJson extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'InvalidJson'
    }
}


export class AuthenticationRequired extends HttpError {
    constructor (code: number, message: string, data: string, response: any) {
        super(code, message, data, response)
        this.name = 'AuthenticationRequired'
    }
}


export class TokenRequired extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'TokenRequired'
    }
}
