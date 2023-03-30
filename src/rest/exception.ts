import { e as httpRequestExc } from '@0k.io/types-request'



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


export class InvalidJson extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'InvalidJson'
    }
}


export class AuthenticationRequired extends httpRequestExc.HttpError {
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


export class InvalidUserOrEmail extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'InvalidUserOrEmail'
    }
}

export class UserOrEmailAlreadyTaken extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'UserOrEmailAlreadyTaken'
    }
}
