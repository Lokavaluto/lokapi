export class UrlFromWrongServer extends Error {
    constructor (message) {
        super(message)
        this.name = 'UrlFromWrongServer'
    }
}


export class UserAccountAlreadyExists extends Error {
    constructor (message) {
        super(message)
        this.name = 'UrlFromWrongServer'
    }
}


export class TimeoutError extends Error {
    constructor (message) {
        super(message)
        this.name = 'TimeoutError'
    }
}


export class PermissionDenied extends Error {
    constructor (message) {
        super(message)
        this.name = 'PermissionDenied'
    }
}


export class InactiveAccount extends Error {
    constructor (message) {
        super(message)
        this.name = 'InactiveAccount'
    }
}
