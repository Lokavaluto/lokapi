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

export class BackendUnavailableTransient extends Error {
    constructor (message) {
        super(message)
        this.name = 'BackendUnavailableTransient'
    }
}

export class CanceledOperation extends Error {
    constructor (message) {
        super(message)
        this.name = 'CanceledOperation'
    }
}

// Payment exceptions

export class PrepareTransferError extends Error {
    constructor (message) {
        super(message)
        this.name = 'PrepareTransferError'
    }
}

export class PrepareTransferException extends PrepareTransferError {

    origException: Error

    constructor (message, origException?: Error) {
        super(message)
        this.name = 'PrepareTransferException'
        this.origException = origException
    }
}

export class PrepareTransferAmountError extends PrepareTransferError {
    constructor (message) {
        super(message)
        this.name = 'PrepareTransferAmountError'
    }
}

export class PrepareTransferInsufficientBalance extends PrepareTransferError {
    constructor (message) {
        super(message)
        this.name = 'PrepareTransferInsufficientBalance'
    }
}

export class PrepareTransferUnsafeBalance extends PrepareTransferError {
    realBal: number
    constructor (message, realBal) {
        super(message)
        this.name = 'PrepareTransferUnsafeBalance'
        this.realBal
    }
}
