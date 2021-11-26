export class UrlFromWrongServer extends Error {
    constructor (message) {
        super(message)
        this.name = 'UrlFromWrongServer'
    }
}
