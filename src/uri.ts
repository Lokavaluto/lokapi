/**
 * Build a lokavaluto URI from its constituent parts.
 *
 * Single source of truth for the URI format:
 * ``[engine]://[currencyIdent]`` (currency level), or
 * ``[engine]://[currencyIdent]/[kind]/[ident]`` (resource level).
 *
 * @example
 * ```
 * buildUri("comchain", "Lemanopolis")
 * // => "comchain://Lemanopolis"
 *
 * buildUri("comchain", "Lemanopolis", { kind: "wallet", ident: "0xabc" })
 * // => "comchain://Lemanopolis/wallet/0xabc"
 * ```
 */
export function buildUri(
    engine: string,
    currencyIdent: string,
    resource?: { kind: 'wallet' | 'user' | 'tx', ident: string },
): string {
    const base = `${engine}://${currencyIdent}`
    if (!resource) return base
    return `${base}/${resource.kind}/${resource.ident}`
}


export function buildWalletUri(
    engine: string,
    currencyIdent: string,
    walletIdent: string,
): string {
    return buildUri(engine, currencyIdent, { kind: 'wallet', ident: walletIdent })
}


export function buildUserUri(
    engine: string,
    currencyIdent: string,
    userIdent: string,
): string {
    return buildUri(engine, currencyIdent, { kind: 'user', ident: userIdent })
}


/**
 * Parse a lokavaluto URI into its constituent parts.
 *
 * Handles currency-level URIs (``engine://currencyIdent``)
 * and resource-level URIs (``engine://currencyIdent/wallet/X``,
 * ``/user/X``, ``/tx/X``).
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(parseUri("comchain://Lemanopolis")).toEqual({
 *     engine: "comchain",
 *     currencyIdent: "Lemanopolis",
 * })
 *
 * expect(parseUri("comchain://Lemanopolis/wallet/0xabc")).toEqual({
 *     engine: "comchain",
 *     currencyIdent: "Lemanopolis",
 *     resource: { kind: "wallet", ident: "0xabc" },
 * })
 * ```
 */
export function parseUri(uri: string): {
    engine: string,
    currencyIdent: string,
    resource?: { kind: string, ident: string },
} {
    const [engine, rest] = uri.split('://')
    if (!rest) {
        throw new Error(`Invalid currency URI: ${uri}`)
    }
    const slashIdx = rest.indexOf('/')
    if (slashIdx === -1) {
        return { engine, currencyIdent: rest }
    }
    const currencyIdent = rest.slice(0, slashIdx)
    const resourcePart = rest.slice(slashIdx + 1)
    const resourceSlashIdx = resourcePart.indexOf('/')
    if (resourceSlashIdx === -1) {
        throw new Error(`Invalid resource in currency URI: ${uri}`)
    }
    const kind = resourcePart.slice(0, resourceSlashIdx)
    const ident = resourcePart.slice(resourceSlashIdx + 1)
    return { engine, currencyIdent, resource: { kind, ident } }
}


/**
 * Convert legacy backend credential format to new URI format.
 *
 * Legacy: ``{ type: "comchain:Lemanopolis", ... }``
 * New:    ``{ currency_uri: "comchain://Lemanopolis", ... }``
 *
 * If ``currency_uri`` is already present, returns the entry as-is.
 */
export function legacyToUri(entry: any): any {
    if (entry.currency_uri) return entry
    if (!entry.type) return entry
    return {
        ...entry,
        currency_uri: entry.type.replace(':', '://'),
    }
}
