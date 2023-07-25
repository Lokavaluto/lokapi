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


export class InvalidAmount extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'InvalidAmount'
    }
}


export class NegativeAmount extends InvalidAmount {
    constructor (message: string) {
        super(message)
        this.name = 'NegativeAmount'
    }
}


export class NullAmount extends InvalidAmount {
    constructor (message: string) {
        super(message)
        this.name = 'NullAmount'
    }
}


export class RefusedAmount extends InvalidAmount {
    constructor (message: string) {
        super(message)
        this.name = 'RefusedAmount'
    }
}


export class InsufficientBalance extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'Insufficientbalance'
    }
}

export class PaymentConfirmationMissing extends Error {
    constructor (message: string) {
        super(message)
        this.name = 'PaymentConfirmationMissing'
    }
}
