import { BridgeObject } from '..'
import { t } from '../..'
import { singleton } from '../../cache'
import { buildUserUri, parseUri } from '../../uri'
import { LccApiClient } from '../../rest/lccApi'


export default abstract class UserAccount extends BridgeObject {

    abstract internalId: string

    /**
     * Plugin-specific identifier for this user account.
     */
    abstract ident: string

    /**
     * Full user URI for LCC API identity headers.
     *
     * Built from the backend's engine and currency identifier
     * combined with this account's ``ident``.
     */
    get uri (): string {
        const { engine, currencyIdent } = parseUri(this.parent.uri)
        return buildUserUri(engine, currencyIdent, this.ident)
    }

    get isTopUpAllowed() {
        return this.jsonData?.is_topup_allowed !== false
    }


    /**
     * LCC API client pre-configured with this user account's
     * identity header.  Use for ``wallet/*`` and ``recipient/*``
     * endpoints.
     *
     * The ``features`` argument is per-call — pass the feature
     * string that the target endpoint expects (e.g. ``"wallet/0"``).
     *
     * Example::
     *
     *     await this.lccApi.$post("/wallet/0xabc/archive", null, "wallet/0")
     *
     */
    @singleton
    get lccApi (): LccApiClient {
        return new LccApiClient(
            this.backends.odoo,
            this.uri,
        )
    }


    // -- Authorized actions (from prefetched backend_credentials) --

    /**
     * Check if this account carries the given authorized action.
     * Inactive accounts are never authorized.
     */
    private _hasAuthorizedAction (action: string): boolean {
        if (!this.jsonData?.active) return false
        return this.jsonData?.authorized_actions?.includes(action) ?? false
    }


    /**
     * Whether this account can activate/validate user accounts.
     * Combines administrative (``authorized_actions``) and
     * financial backend checks.
     */
    public async hasUserAccountValidationRights (): Promise<boolean> {
        return this._hasAuthorizedAction("activate") &&
            await this.hasUserAccountValidationRightsForFinancialBackend()
    }

    /**
     * Financial backend check for user account validation rights.
     * Override in backend chains (e.g. comchain reads from blockchain).
     */
    public async hasUserAccountValidationRightsForFinancialBackend (): Promise<boolean> {
        return true
    }


    /**
     * Whether this account can validate credit requests.
     * Combines administrative and financial backend checks.
     */
    public async hasCreditRequestValidationRights (): Promise<boolean> {
        return this._hasAuthorizedAction("validate-credit-request") &&
            await this.hasCreditRequestValidationRightsForFinancialBackend()
    }

    /**
     * Financial backend check for credit request validation rights.
     * Override in backend chains.
     */
    public async hasCreditRequestValidationRightsForFinancialBackend (): Promise<boolean> {
        return true
    }


    /**
     * Whether this account can search all recipients
     * (without restriction rules).
     */
    public canSearchAllRecipients (): boolean {
        return this._hasAuthorizedAction("search-all-recipients")
    }


    /**
     * Whether this account can set permissions on other wallets.
     * Combines administrative and financial backend checks.
     */
    public async canSetPermissions (): Promise<boolean> {
        return this._hasAuthorizedAction("activate") &&
            await this.canSetPermissionsForFinancialBackend()
    }

    /**
     * Financial backend check for permission-setting rights.
     * Override in backend chains.
     */
    public async canSetPermissionsForFinancialBackend (): Promise<boolean> {
        return true
    }


    /**
     * Search all recipients without restriction rules.
     *
     * This is the per-user-account counterpart of the backend-level
     * ``searchAllRecipients``.  It uses the LCC API endpoint
     * ``GET /recipient/search_all`` which requires user identity
     * and feature headers.
     *
     * @param value  Search string matched against name, email, phone
     *
     * @returns AsyncIterable<t.IRecipient>
     */
    public async * searchAllRecipients (value: string): AsyncIterable<t.IRecipient> {
        let offset = 0
        const limit = 30
        while (true) {
            const partners = await this.lccApi.$get('/recipient/search_all', {
                value,
                backend_keys: [this.parent.internalId],
                offset,
                limit,
                order: 'is_favorite desc, name',
            }, 'recipient/0')
            for (const partnerData of partners.rows) {
                for (const recipient of this.parent.makeRecipients(partnerData)) {
                    yield recipient
                }
            }
            if (partners.rows.length < limit) return
            offset += limit
        }
    }


    /**
     * Refresh this user account's data from the administrative
     * backend via the LCC API ``GET /wallet/<ident>/get`` endpoint.
     *
     * @param caller  Optional caller account whose identity is
     *     used for the LCC API request.  Defaults to ``this``.
     *     Pass an admin account to refresh another user's wallet.
     *
     * @throws {RequestFailed, APIRequestFailed, InvalidCredentials, InvalidJson}
     */
    public async refresh (caller?: UserAccount): Promise<void> {
        const freshData = await (caller || this).lccApi.$get(
            `/wallet/${this.ident}/get`, null, 'wallet/0'
        )
        Object.assign(this.jsonData, freshData)
    }

}
