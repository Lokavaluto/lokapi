/**
 * Client for LCC API endpoints (wallet/*, recipient/*) that
 * require ``X-Lokapi-Caller-User-Uri`` on every request.
 *
 * Feature negotiation (``X-Client-Features``) is delegated to
 * the underlying odoo client's ``JsonRESTFeatureClientAbstract``
 * layer via ``FeatureOpts``.
 *
 * Wraps an existing Odoo REST client, delegating the actual
 * HTTP work while injecting the caller user URI header.
 *
 * Usage::
 *
 *     const lcc = new LccApiClient(odoo, "comchain://Lemanopolis/user/0xabc")
 *
 *     // Old-style (features as string):
 *     await lcc.$post("/wallet/0xabc/archive", null, "wallet/0")
 *     await lcc.$get("/recipient/search_all", params, "recipient/0")
 *
 *     // New opts-style (with selected/supported features):
 *     const selected: string[] = []
 *     await lcc.$get("/wallet/archived", null, {
 *         features: "wallet/0-2",
 *         selectedFeatures: selected,
 *     })
 *
 */
import { FeatureOpts } from './features'


export class LccApiClient {

    private odoo: any
    private callerUserUri: string

    constructor (odoo: any, callerUserUri: string) {
        this.odoo = odoo
        this.callerUserUri = callerUserUri
    }

    /**
     * Normalize arguments to ``FeatureOpts``, injecting the
     * caller user URI header.
     *
     * Supports both old-style (features as string + positional
     * headers/responseHeaders) and new-style (``FeatureOpts``
     * object) calls.
     */
    private toOpts (
        featuresOrOpts?: string | FeatureOpts,
        headers?: { [k: string]: any },
        responseHeaders?: { [k: string]: any },
    ): FeatureOpts {
        if (featuresOrOpts && typeof featuresOrOpts === 'object') {
            // New-style: FeatureOpts object
            return {
                ...featuresOrOpts,
                headers: {
                    'X-Lokapi-Caller-User-Uri': this.callerUserUri,
                    ...featuresOrOpts.headers,
                },
            }
        }
        // Old-style: features string (or undefined/empty)
        const features = typeof featuresOrOpts === 'string'
            ? featuresOrOpts : undefined
        return {
            features: features || undefined,
            headers: {
                'X-Lokapi-Caller-User-Uri': this.callerUserUri,
                ...headers,
            },
            responseHeaders,
        }
    }

    async $get (
        path: string,
        data?: any,
        featuresOrOpts?: string | FeatureOpts,
        headers?: { [k: string]: any },
        responseHeaders?: { [k: string]: any },
    ): Promise<any> {
        return this.odoo.$get(
            path, data,
            this.toOpts(featuresOrOpts, headers, responseHeaders),
        )
    }

    async $post (
        path: string,
        data?: any,
        featuresOrOpts?: string | FeatureOpts,
        headers?: { [k: string]: any },
        responseHeaders?: { [k: string]: any },
    ): Promise<any> {
        return this.odoo.$post(
            path, data,
            this.toOpts(featuresOrOpts, headers, responseHeaders),
        )
    }

    async $put (
        path: string,
        data?: any,
        featuresOrOpts?: string | FeatureOpts,
        headers?: { [k: string]: any },
        responseHeaders?: { [k: string]: any },
    ): Promise<any> {
        return this.odoo.$put(
            path, data,
            this.toOpts(featuresOrOpts, headers, responseHeaders),
        )
    }

    async $delete (
        path: string,
        data?: any,
        featuresOrOpts?: string | FeatureOpts,
        headers?: { [k: string]: any },
        responseHeaders?: { [k: string]: any },
    ): Promise<any> {
        return this.odoo.$delete(
            path, data,
            this.toOpts(featuresOrOpts, headers, responseHeaders),
        )
    }
}


/* @skip-prod-transpilation */
if (import.meta.vitest) {
    const { describe, it, expect, vi, beforeEach } = import.meta.vitest

    /**
     * Specification:
     *
     * 1. Every request injects ``X-Lokapi-Caller-User-Uri`` from the
     *    constructor argument into ``opts.headers``.
     *
     * 2. When a ``features`` string is provided (old-style), it is
     *    forwarded as ``opts.features``.
     *
     * 3. When ``features`` is omitted or empty, ``opts.features``
     *    is ``undefined``.
     *
     * 4. Caller-provided ``headers`` (old-style) are merged into
     *    ``opts.headers`` and take precedence over the URI header.
     *
     * 5. ``data`` is forwarded as-is to the underlying odoo client.
     *
     * 6. ``responseHeaders`` (old-style) is forwarded in
     *    ``opts.responseHeaders``.
     *
     * 7. All four HTTP verbs ($get, $post, $put, $delete) delegate
     *    to their odoo counterpart via ``FeatureOpts``.
     *
     * 8. New-style ``FeatureOpts`` object as 3rd arg is forwarded
     *    with caller URI merged into ``opts.headers``.
     *
     * 9. ``FeatureOpts.headers`` take precedence over the
     *    injected caller URI header.
     */


    function makeMockOdoo () {
        return {
            $get: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ ok: true }),
            $post: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ ok: true }),
            $put: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ ok: true }),
            $delete: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ ok: true }),
        }
    }


    describe('LccApiClient', () => {

        const userUri = 'comchain://Lemanopolis/user/0xabc123'
        let odoo: ReturnType<typeof makeMockOdoo>
        let client: LccApiClient

        beforeEach(() => {
            odoo = makeMockOdoo()
            client = new LccApiClient(odoo, userUri)
        })


        describe('caller user URI header', () => {

            it('injects X-Lokapi-Caller-User-Uri on $get', async () => {
                await client.$get('/wallet/archived', null, 'wallet/0')
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
            })

            it('injects X-Lokapi-Caller-User-Uri on $post', async () => {
                await client.$post('/wallet/0xabc/archive', null, 'wallet/0')
                const opts = odoo.$post.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
            })

            it('injects X-Lokapi-Caller-User-Uri on $put', async () => {
                await client.$put('/wallet/0xabc/update', { status: 'active' }, 'wallet/0')
                const opts = odoo.$put.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
            })

            it('injects X-Lokapi-Caller-User-Uri on $delete', async () => {
                await client.$delete('/recipient/42', null, 'recipient/0')
                const opts = odoo.$delete.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
            })
        })


        describe('features forwarding (old-style)', () => {

            it('forwards features string as opts.features', async () => {
                await client.$get('/wallet/archived', null, 'wallet/0')
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.features).toBe('wallet/0')
            })

            it('supports multiple features in the features string', async () => {
                await client.$post('/wallet/0xabc/update', {}, 'wallet/0-2 recipient/0')
                const opts = odoo.$post.mock.calls[0][2]
                expect(opts.features).toBe('wallet/0-2 recipient/0')
            })

            it('sets opts.features to undefined when features is omitted', async () => {
                await client.$get('/wallet/archived', null)
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.features).toBeUndefined()
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
            })

            it('sets opts.features to undefined when features is empty string', async () => {
                await client.$get('/wallet/archived', null, '')
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.features).toBeUndefined()
            })
        })


        describe('argument forwarding (old-style)', () => {

            it('forwards path and data to odoo', async () => {
                const data = { value: 'test', offset: 0 }
                await client.$get('/recipient/search_all', data, 'recipient/0')
                expect(odoo.$get.mock.calls[0][0]).toBe('/recipient/search_all')
                expect(odoo.$get.mock.calls[0][1]).toEqual(data)
            })

            it('forwards responseHeaders in opts', async () => {
                const responseHeaders = {}
                await client.$get('/wallet/archived', null, 'wallet/0', undefined, responseHeaders)
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.responseHeaders).toBe(responseHeaders)
            })

            it('merges caller headers into opts.headers', async () => {
                const extraHeaders = { 'X-Custom': 'value' }
                await client.$post('/wallet/0xabc/archive', null, 'wallet/0', extraHeaders)
                const opts = odoo.$post.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
                expect(opts.headers['X-Custom']).toBe('value')
            })

            it('caller headers override injected URI header', async () => {
                const overrideUri = 'comchain://Other/user/0xdef'
                const extraHeaders = { 'X-Lokapi-Caller-User-Uri': overrideUri }
                await client.$post('/wallet/0xabc/archive', null, 'wallet/0', extraHeaders)
                const opts = odoo.$post.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(overrideUri)
            })
        })


        describe('new-style FeatureOpts', () => {

            it('forwards FeatureOpts with URI merged', async () => {
                const selected: string[] = []
                await client.$get('/wallet/archived', null, {
                    features: 'wallet/0-2',
                    selectedFeatures: selected,
                })
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.features).toBe('wallet/0-2')
                expect(opts.selectedFeatures).toBe(selected)
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(userUri)
            })

            it('FeatureOpts headers override injected URI', async () => {
                const overrideUri = 'comchain://Other/user/0xdef'
                await client.$get('/path', null, {
                    features: 'wallet/0',
                    headers: { 'X-Lokapi-Caller-User-Uri': overrideUri },
                })
                const opts = odoo.$get.mock.calls[0][2]
                expect(opts.headers['X-Lokapi-Caller-User-Uri']).toBe(overrideUri)
            })
        })


        describe('return value', () => {

            it('returns the value from the odoo method', async () => {
                odoo.$get.mockResolvedValue({ wallets: ['a', 'b'] })
                const result = await client.$get('/wallet/archived', null, 'wallet/0')
                expect(result).toEqual({ wallets: ['a', 'b'] })
            })
        })
    })
}
