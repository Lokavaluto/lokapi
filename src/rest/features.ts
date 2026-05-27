/**
 * Feature negotiation layer for the REST client hierarchy.
 *
 * Inserts between ``JsonRESTPersistentClientAbstract`` and
 * ``OdooRESTAbstract``, overriding ``$get``/``$post``/``$put``/
 * ``$delete`` to support an optional ``FeatureOpts`` third
 * argument alongside the original positional headers.
 *
 * Inheritance chain::
 *
 *     LokAPIAbstract
 *      └→ OdooRESTAbstract
 *          └→ JsonRESTFeatureClientAbstract    ← this class
 *              └→ JsonRESTPersistentClientAbstract
 *                  └→ JsonRESTSessionClientAbstract
 *                      └→ JsonRESTClientAbstract
 */
import {
    e as httpRequestExc,
    t as httpRequestType,
} from '@0k/types-request'

import { JsonRESTPersistentClientAbstract } from '.'
import * as e from './exception'


export type FeatureOpts = {
    features?: string
    headers?: { [k: string]: any }
    responseHeaders?: { [k: string]: any }
    selectedFeatures?: string[]
    supportedFeatures?: string[]
}


/**
 * Detect whether the third argument to ``$get``/``$post``/… is a
 * ``FeatureOpts`` object or plain HTTP headers.
 *
 * Detection relies on the presence of keys that are specific to
 * ``FeatureOpts`` and never appear as HTTP header names.
 */
function isFeatureOpts (arg: any): arg is FeatureOpts {
    if (!arg || typeof arg !== 'object' || Array.isArray(arg)) return false
    return (
        'features' in arg ||
        'selectedFeatures' in arg ||
        'supportedFeatures' in arg
    )
}


/**
 * Parse a feature specifier string into individual features.
 *
 * @example
 * ```ts
 * import { parseFeatureSpecifier } from './features'
 *
 * // Simple version
 * expect(parseFeatureSpecifier("search/2")).toEqual(["search/2"])
 *
 * // Range expansion
 * expect(parseFeatureSpecifier("search/0-2")).toEqual(
 *     ["search/0", "search/1", "search/2"]
 * )
 *
 * // Mixed ranges and discrete versions
 * expect(parseFeatureSpecifier("cap/0-2,5")).toEqual(
 *     ["cap/0", "cap/1", "cap/2", "cap/5"]
 * )
 *
 * // Multiple features
 * expect(parseFeatureSpecifier("search/0-1 auth/2")).toEqual(
 *     ["search/0", "search/1", "auth/2"]
 * )
 *
 * // Empty / falsy input
 * expect(parseFeatureSpecifier("")).toEqual([])
 * ```
 */
export function parseFeatureSpecifier (spec: string): string[] {
    if (!spec) return []
    const result: string[] = []
    for (const part of spec.split(/\s+/)) {
        if (!part) continue
        const slashIdx = part.lastIndexOf('/')
        if (slashIdx === -1) continue
        const name = part.slice(0, slashIdx)
        const versionSpec = part.slice(slashIdx + 1)
        for (const segment of versionSpec.split(',')) {
            const trimmed = segment.trim()
            if (!trimmed) continue
            if (trimmed.includes('-')) {
                const [lo, hi] = trimmed.split('-').map(Number)
                for (let v = lo; v <= hi; v++) {
                    result.push(`${name}/${v}`)
                }
            } else {
                result.push(`${name}/${trimmed}`)
            }
        }
    }
    return result
}


/**
 * Case-insensitive response header lookup.
 *
 * HTTP/2 normalizes headers to lowercase, but in batch mode
 * the casing comes from the server's JSON response body.
 */
function getResponseHeader (
    headers: { [k: string]: any },
    name: string,
): string | undefined {
    if (!headers) return undefined
    const lower = name.toLowerCase()
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === lower) return headers[key]
    }
    return undefined
}


/**
 * Parse a space-separated features header value into a list.
 */
function parseFeaturesHeader (value: string | undefined): string[] {
    if (!value) return []
    return value.split(/\s+/).filter(Boolean)
}


/**
 * Abstract class adding feature negotiation to the REST client
 * chain.  Overrides ``$get``/``$post``/``$put``/``$delete``
 * (and their unauthenticated counterparts) to accept an optional
 * ``FeatureOpts`` third argument.
 *
 * When called with a ``FeatureOpts`` object:
 *
 *   - injects ``X-Client-Features`` request header
 *     from ``opts.features``
 *   - fills ``opts.selectedFeatures`` from
 *     ``X-Selected-Features`` response header
 *   - fills ``opts.supportedFeatures`` from
 *     ``X-Supported-Features`` response header
 *   - catches HTTP 406 → throws ``FeatureMismatchError``
 *
 * When called with plain headers (or no third arg), passes
 * through to the parent class unchanged — full backward
 * compatibility.
 *
 * Feature handling lives entirely in the verb wrappers below;
 * ``request()`` is intentionally NOT overridden so transport-level
 * concerns (batching, retries) can be layered cleanly above it
 * in subclasses.
 */
export abstract class JsonRESTFeatureClientAbstract
    extends JsonRESTPersistentClientAbstract {
}


httpRequestType.httpMethods.forEach((method) => {
    const methodLc = method.toLowerCase()

    /**
     * Override ``post``/``$post``/etc to detect ``FeatureOpts``
     * as the 3rd argument. Performs the full feature negotiation
     * (header injection, response header extraction, 406 wrapping)
     * inline, then delegates to the corresponding ancestor verb
     * with plain ``HttpOpts``-shaped arguments.
     */
    function makeHandler (base: string) {
        return async function (
            this: any,
            path: string,
            data?: any,
            headersOrOpts?: any,
            responseHeaders?: { [k: string]: any },
        ) {
            // Old-style: plain headers or absent → pass through
            if (!isFeatureOpts(headersOrOpts)) {
                return JsonRESTPersistentClientAbstract.prototype[
                    base
                ].apply(this, [path, data, headersOrOpts, responseHeaders])
            }
            // New-style: FeatureOpts. Inject X-Client-Features,
            // capture response headers, wrap 406, then delegate.
            const fo = headersOrOpts as FeatureOpts
            const mergedHeaders = {
                ...(fo.features && { 'X-Client-Features': fo.features }),
                ...fo.headers,
            }
            // Need a responseHeaders bag to read X-Selected-/X-Supported-
            // Features from. Reuse the caller's bag if provided so any
            // other headers they wanted also land there; otherwise
            // allocate a private one.
            const rh = fo.responseHeaders ?? {}

            let result: any
            try {
                result = await JsonRESTPersistentClientAbstract.prototype[
                    base
                ].apply(this, [path, data, mergedHeaders, rh])
            } catch (err) {
                if (
                    err instanceof httpRequestExc.HttpError &&
                    err.code === 406
                ) {
                    let supported: string[] = []
                    try {
                        const body = JSON.parse(err.data)
                        supported = body.supported || []
                    } catch (_) {}
                    throw new e.FeatureMismatchError(
                        fo.features || '',
                        supported,
                        err,
                    )
                }
                throw err
            }

            if (fo.selectedFeatures) {
                fo.selectedFeatures.push(
                    ...parseFeaturesHeader(
                        getResponseHeader(rh, 'X-Selected-Features'),
                    ),
                )
            }
            if (fo.supportedFeatures) {
                fo.supportedFeatures.push(
                    ...parseFeaturesHeader(
                        getResponseHeader(rh, 'X-Supported-Features'),
                    ),
                )
            }

            return result
        }
    }

    JsonRESTFeatureClientAbstract.prototype['$' + methodLc] =
        makeHandler('$' + methodLc)
    JsonRESTFeatureClientAbstract.prototype[methodLc] =
        makeHandler(methodLc)
})


/* @skip-prod-transpilation */
if (import.meta.vitest) {
    const { describe, it, expect, vi, beforeEach } = import.meta.vitest


    /**
     * Specification:
     *
     * ``parseFeatureSpecifier``
     *
     * 1. Single feature: ``"search/2"`` → ``["search/2"]``
     * 2. Range: ``"search/0-2"`` → ``["search/0", "search/1", "search/2"]``
     * 3. Mixed: ``"cap/0-2,5"`` → ``["cap/0", "cap/1", "cap/2", "cap/5"]``
     * 4. Multiple features: ``"search/0-1 auth/2"`` →
     *    ``["search/0", "search/1", "auth/2"]``
     * 5. Empty / falsy input → ``[]``
     *
     * ``isFeatureOpts``
     *
     * 6. Object with ``features`` key → detected as ``FeatureOpts``
     * 7. Object with ``selectedFeatures`` key → detected
     * 8. Object with ``supportedFeatures`` key → detected
     * 9. Plain headers object (e.g. ``{"X-Custom": "v"}``) → NOT detected
     * 10. ``null``, ``undefined``, non-object → NOT detected
     *
     * ``JsonRESTFeatureClientAbstract.$get``
     *
     * 11. Old-style call (3rd arg is headers or absent) passes through
     *     unchanged to parent ``$get``.
     * 12. New-style call (3rd arg is ``FeatureOpts``) injects
     *     ``X-Client-Features`` from ``opts.features``.
     * 13. No ``X-Client-Features`` header when ``opts.features`` is
     *     absent/empty.
     * 14. ``opts.selectedFeatures`` is filled in-place from
     *     ``X-Selected-Features`` response header.
     * 15. ``opts.supportedFeatures`` is filled in-place from
     *     ``X-Supported-Features`` response header.
     * 16. Case-insensitive header matching for response headers.
     * 17. HTTP 406 → throws ``FeatureMismatchError`` with supported
     *     features from response body.
     * 18. ``opts.headers`` are merged after feature header (caller
     *     headers take precedence).
     * 19. ``opts.responseHeaders`` is forwarded to the underlying call.
     * 20. Non-406 errors pass through without wrapping.
     */


    describe('parseFeatureSpecifier', () => {

        it('returns empty array for undefined/null input', () => {
            expect(parseFeatureSpecifier(undefined as any)).toEqual([])
            expect(parseFeatureSpecifier(null as any)).toEqual([])
        })
    })


    describe('isFeatureOpts', () => {

        it('detects object with features key', () => {
            expect(isFeatureOpts({ features: 'wallet/0' })).toBe(true)
        })

        it('detects object with features: undefined', () => {
            expect(isFeatureOpts({ features: undefined })).toBe(true)
        })

        it('detects object with selectedFeatures key', () => {
            expect(isFeatureOpts({ selectedFeatures: [] })).toBe(true)
        })

        it('detects object with supportedFeatures key', () => {
            expect(isFeatureOpts({ supportedFeatures: [] })).toBe(true)
        })

        it('rejects plain headers object', () => {
            expect(isFeatureOpts({ 'X-Custom': 'val' })).toBe(false)
        })

        it('rejects null/undefined/non-objects', () => {
            expect(isFeatureOpts(null)).toBe(false)
            expect(isFeatureOpts(undefined)).toBe(false)
            expect(isFeatureOpts('string')).toBe(false)
            expect(isFeatureOpts(42)).toBe(false)
        })

        it('rejects arrays', () => {
            expect(isFeatureOpts(['features'])).toBe(false)
        })
    })


    /**
     * Create a minimal mock that exposes ``$get``/``$post``/``$put``/
     * ``$delete`` so we can spy on calls forwarded by the feature
     * layer.
     *
     * The mock stands in for ``JsonRESTPersistentClientAbstract``
     * at the prototype level.
     */
    /**
     * Mock ``httpRequest`` that returns a JSON string and
     * optionally populates response headers.
     *
     * Call ``mockResponseHeaders({ 'X-Foo': 'bar' })`` to have
     * the next request populate response headers.
     */
    function makeHttpRequestMock () {
        let nextResponseHeaders: Record<string, string> = {}
        const mock = vi.fn<(...args: any[]) => Promise<string>>(
            async (opts: any) => {
                if (opts.responseHeaders) {
                    Object.assign(opts.responseHeaders, nextResponseHeaders)
                }
                nextResponseHeaders = {}
                return JSON.stringify({ ok: true })
            },
        )
        return {
            mock,
            mockResponseHeaders (headers: Record<string, string>) {
                nextResponseHeaders = headers
            },
            /** Get the headers sent in the last call */
            get lastHeaders (): Record<string, string> {
                const calls = mock.mock.calls
                return calls[calls.length - 1]?.[0]?.headers || {}
            },
        }
    }


    describe('JsonRESTFeatureClientAbstract', () => {

        let httpMock: ReturnType<typeof makeHttpRequestMock>
        let instance: any

        beforeEach(() => {
            httpMock = makeHttpRequestMock()

            class TestFeatureClient extends JsonRESTFeatureClientAbstract {
                AUTH_HEADER = 'API-KEY'
                internalId = 'test'
                httpRequest = httpMock.mock
                base64Encode = vi.fn((s: string) => s)
                persistentStore = {
                    get: vi.fn(),
                    set: vi.fn(),
                    del: vi.fn(),
                }
                requestLogin = vi.fn()
            }
            instance = new TestFeatureClient('http://test')
            instance.apiToken = 'test-token'
        })


        describe('old-style passthrough', () => {

            it('forwards plain headers call unchanged', async () => {
                await instance.$get('/path', { q: 1 }, { 'X-Custom': 'val' })
                expect(httpMock.lastHeaders['X-Custom']).toBe('val')
                expect(httpMock.mock).toHaveBeenCalledTimes(1)
            })

            it('forwards undefined 3rd arg unchanged', async () => {
                await instance.$post('/path', { q: 1 })
                expect(httpMock.mock).toHaveBeenCalledTimes(1)
            })
        })


        describe('feature header injection', () => {

            it('injects X-Client-Features from opts.features', async () => {
                await instance.$get('/path', null, {
                    features: 'wallet/0-2',
                })
                expect(httpMock.lastHeaders['X-Client-Features']).toBe('wallet/0-2')
            })

            it('omits X-Client-Features when features is absent', async () => {
                await instance.$get('/path', null, {
                    selectedFeatures: [],
                })
                expect(httpMock.lastHeaders).not.toHaveProperty('X-Client-Features')
            })

            it('omits X-Client-Features when features is empty', async () => {
                await instance.$get('/path', null, {
                    features: '',
                })
                expect(httpMock.lastHeaders).not.toHaveProperty('X-Client-Features')
            })

            it('merges opts.headers after feature header', async () => {
                await instance.$post('/path', null, {
                    features: 'wallet/0',
                    headers: { 'X-Extra': 'yes' },
                })
                expect(httpMock.lastHeaders['X-Client-Features']).toBe('wallet/0')
                expect(httpMock.lastHeaders['X-Extra']).toBe('yes')
            })

            it('opts.headers override feature header', async () => {
                await instance.$post('/path', null, {
                    features: 'wallet/0',
                    headers: { 'X-Client-Features': 'override/1' },
                })
                expect(httpMock.lastHeaders['X-Client-Features']).toBe('override/1')
            })
        })


        describe('response header extraction', () => {

            it('fills selectedFeatures from X-Selected-Features', async () => {
                httpMock.mockResponseHeaders({
                    'X-Selected-Features': 'wallet/0 recipient/0',
                })
                const selected: string[] = []
                await instance.$get('/path', null, {
                    features: 'wallet/0-2 recipient/0',
                    selectedFeatures: selected,
                })
                expect(selected).toEqual(['wallet/0', 'recipient/0'])
            })

            it('fills supportedFeatures from X-Supported-Features', async () => {
                httpMock.mockResponseHeaders({
                    'X-Supported-Features': 'wallet/0 wallet/1',
                })
                const supported: string[] = []
                await instance.$get('/path', null, {
                    features: 'wallet/0-2',
                    supportedFeatures: supported,
                })
                expect(supported).toEqual(['wallet/0', 'wallet/1'])
            })

            it('handles lowercase response headers (HTTP/2)', async () => {
                httpMock.mockResponseHeaders({
                    'x-selected-features': 'wallet/1',
                })
                const selected: string[] = []
                await instance.$get('/path', null, {
                    features: 'wallet/0-1',
                    selectedFeatures: selected,
                })
                expect(selected).toEqual(['wallet/1'])
            })

            it('does not crash when selectedFeatures is not provided', async () => {
                httpMock.mockResponseHeaders({
                    'X-Selected-Features': 'wallet/0',
                })
                const result = await instance.$get('/path', null, {
                    features: 'wallet/0',
                })
                expect(result).toEqual({ ok: true })
            })

            it('forwards opts.responseHeaders to underlying call', async () => {
                httpMock.mockResponseHeaders({
                    'X-Custom': 'yes',
                })
                const rh: Record<string, any> = {}
                await instance.$get('/path', null, {
                    features: 'wallet/0',
                    responseHeaders: rh,
                })
                expect(rh['X-Custom']).toBe('yes')
            })
        })


        describe('406 feature mismatch', () => {

            it('throws FeatureMismatchError on 406 with body', async () => {
                httpMock.mock.mockRejectedValueOnce(
                    new httpRequestExc.HttpError(
                        406,
                        'Not Acceptable',
                        JSON.stringify({
                            error: 'Missing required feature: profile/2',
                            supported: ['profile/1', 'auth/1'],
                        }),
                        {},
                    ),
                )
                const err = await instance.$post('/path', null, {
                    features: 'profile/2',
                }).catch((e: any) => e)
                expect(err).toBeInstanceOf(e.FeatureMismatchError)
                expect(err.requestedFeatures).toBe('profile/2')
                expect(err.supportedFeatures).toEqual([
                    'profile/1', 'auth/1',
                ])
            })

            it('throws FeatureMismatchError on 406 with unparseable body', async () => {
                httpMock.mock.mockRejectedValueOnce(
                    new httpRequestExc.HttpError(
                        406, 'Not Acceptable', 'not json', {},
                    ),
                )
                const err = await instance.$post('/path', null, {
                    features: 'wallet/2',
                }).catch((e: any) => e)
                expect(err).toBeInstanceOf(e.FeatureMismatchError)
                expect(err.supportedFeatures).toEqual([])
            })

            it('passes through non-406 errors unchanged', async () => {
                httpMock.mock.mockRejectedValueOnce(
                    new httpRequestExc.HttpError(
                        500, 'Internal Server Error', '', {},
                    ),
                )
                const err = await instance.$get('/path', null, {
                    features: 'wallet/0',
                }).catch((e: any) => e)
                expect(err).toBeInstanceOf(httpRequestExc.HttpError)
                expect(err.code).toBe(500)
                expect(err).not.toBeInstanceOf(e.FeatureMismatchError)
            })

            it('passes through non-HttpError errors unchanged', async () => {
                httpMock.mock.mockRejectedValueOnce(new Error('network down'))
                const err = await instance.$get('/path', null, {
                    features: 'wallet/0',
                }).catch((e: any) => e)
                expect(err.message).toBe('network down')
            })
        })


        describe('all HTTP verbs', () => {

            for (const verb of ['$get', '$post', '$put', '$delete']) {
                it(`${verb} supports FeatureOpts`, async () => {
                    httpMock.mockResponseHeaders({
                        'X-Selected-Features': 'test/1',
                    })
                    const selected: string[] = []
                    const result = await instance[verb]('/path', null, {
                        features: 'test/0-1',
                        selectedFeatures: selected,
                    })
                    expect(result).toEqual({ ok: true })
                    expect(selected).toEqual(['test/1'])
                })
            }
        })


        describe('unauthenticated methods', () => {

            it('post supports FeatureOpts without auth', async () => {
                await instance.post('/auth/test', null, {
                    features: 'uri/0 feature-less/0',
                    headers: { Authorization: 'Basic xxx' },
                })
                expect(httpMock.lastHeaders['X-Client-Features'])
                    .toBe('uri/0 feature-less/0')
                expect(httpMock.lastHeaders['Authorization']).toBe('Basic xxx')
            })
        })
    })
}
