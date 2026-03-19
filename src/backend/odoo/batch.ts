import { e as httpRequestExc } from '@0k/types-request'

import * as t from '../../type'


const BATCH_PATH = '/batch'


type PendingEntry = {
    path: string
    opts: t.HttpOpts
    resolve: (value: any) => void
    reject: (reason: any) => void
}


export class BatchQueue {

    private pending: PendingEntry[] = []
    private fingerprints: Map<string, Promise<any>> = new Map()
    private flushScheduled = false
    private directRequest: (path: string, opts: t.HttpOpts) => Promise<any>


    constructor (
        directRequest: (path: string, opts: t.HttpOpts) => Promise<any>,
    ) {
        this.directRequest = directRequest
    }


    enqueue (path: string, opts: t.HttpOpts): Promise<any> {
        const fingerprint = JSON.stringify({
            path,
            method: opts.method,
            data: opts.data,
            headers: opts.headers,
        })

        if (this.fingerprints.has(fingerprint)) {
            return this.fingerprints.get(fingerprint)!
        }

        const promise = new Promise((resolve, reject) => {
            this.pending.push({ path, opts, resolve, reject })
        })
        this.fingerprints.set(fingerprint, promise)

        if (!this.flushScheduled) {
            this.flushScheduled = true
            setTimeout(() => this.flush(), 0)
        }

        return promise
    }


    private async flush () {
        const entries = this.pending.splice(0)
        this.fingerprints.clear()
        this.flushScheduled = false

        if (entries.length === 0) return

        if (entries.length === 1) {
            const entry = entries[0]
            try {
                const result = await this.directRequest(
                    entry.path,
                    entry.opts,
                )
                entry.resolve(result)
            } catch (err) {
                entry.reject(err)
            }
            return
        }

        // Build batch payload: each sub-request specifies path,
        // method, and optionally body and headers. Auth headers
        // are forwarded by the server from the parent batch POST;
        // per-sub-request headers (e.g. X-Client-Features,
        // X-Lokapi-Caller-User-Uri) are sent alongside.
        const batchRequests = entries.map(entry => ({
            path: entry.path,
            method: entry.opts.method,
            ...(entry.opts.data !== undefined && {
                body: entry.opts.data,
            }),
            ...(entry.opts.headers && {
                headers: entry.opts.headers,
            }),
        }))

        // Carry auth headers from the first entry — all entries
        // within a single flush share the same session context.
        const headers = entries[0].opts.headers

        try {
            const batchResponse = await this.directRequest(
                BATCH_PATH,
                {
                    method: 'POST',
                    headers,
                    data: { requests: batchRequests } as any,
                },
            )

            const responses = batchResponse.responses
            for (let i = 0; i < entries.length; i++) {
                const subResponse = responses[i]
                if (subResponse.status >= 400) {
                    entries[i].reject(
                        new httpRequestExc.HttpError(
                            subResponse.status,
                            'Batch sub-request failed',
                            JSON.stringify(subResponse.body),
                            subResponse,
                        )
                    )
                } else {
                    if (subResponse.headers && entries[i].opts.responseHeaders) {
                        Object.assign(
                            entries[i].opts.responseHeaders,
                            subResponse.headers,
                        )
                    }
                    entries[i].resolve(subResponse.body)
                }
            }
        } catch (err) {
            // Batch POST itself failed — reject all queued promises
            for (const entry of entries) {
                entry.reject(err)
            }
        }
    }
}


/* @skip-prod-transpilation */
if (import.meta.vitest) {
    const { describe, it, expect, vi, beforeEach } = import.meta.vitest

    /**
     * Specification:
     *
     * 1. Single request in a tick → bypass: sent directly via
     *    directRequest, NOT wrapped in /batch.
     *
     * 2. Multiple requests in the same tick → batched: sent as a
     *    single POST /batch with all sub-requests; each caller
     *    gets its own resolved value from the batch response.
     *
     * 3. Identical requests (same path + method + data + headers) in
     *    the same tick → deduplicated: return the exact same promise.
     *
     * 4. Batch sub-response with status >= 400 → the corresponding
     *    promise rejects with an HttpError carrying the status code.
     *
     * 5. Batch POST failure → all queued promises reject with the
     *    same error.
     *
     * 6. After flush, the queue is empty and ready for the next tick.
     *
     * 7. Per-sub-request headers are included in the batch payload
     *    for each sub-request.
     *
     * 8. Different headers on otherwise identical requests →
     *    NOT deduplicated (separate sub-requests).
     *
     * 9. Sub-response ``headers`` (X-* response headers) are
     *    written into the caller's ``responseHeaders`` object.
     *
     * 10. Missing ``responseHeaders`` in opts → sub-response headers
     *     are silently ignored (no crash).
     */


    function makeDirectRequest () {
        return vi.fn<(path: string, opts: any) => Promise<any>>()
    }


    describe('BatchQueue', () => {

        let directRequest: ReturnType<typeof makeDirectRequest>
        let queue: BatchQueue

        beforeEach(() => {
            directRequest = makeDirectRequest()
            queue = new BatchQueue(directRequest)
            vi.useFakeTimers()
        })


        it('single request bypass: calls directRequest with original path/opts', async () => {
            directRequest.mockResolvedValueOnce({ id: 1 })

            const promise = queue.enqueue('/partner/0', {
                method: 'GET',
                headers: { 'API-KEY': 'tok' },
            })

            // Flush the setTimeout(fn, 0)
            await vi.advanceTimersByTimeAsync(0)

            const result = await promise

            expect(result).toEqual({ id: 1 })
            expect(directRequest).toHaveBeenCalledTimes(1)
            expect(directRequest).toHaveBeenCalledWith('/partner/0', {
                method: 'GET',
                headers: { 'API-KEY': 'tok' },
            })
        })


        it('batches multiple requests via POST /batch', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: { balance: '100' } },
                    { status: 200, body: { name: 'Alice' } },
                ],
            })

            const p1 = queue.enqueue('/wallet/balance', {
                method: 'POST',
                headers: { 'API-KEY': 'tok' },
                data: { wallet_id: 1 },
            })
            const p2 = queue.enqueue('/partner/0', {
                method: 'GET',
                headers: { 'API-KEY': 'tok' },
            })

            await vi.advanceTimersByTimeAsync(0)

            const [r1, r2] = await Promise.all([p1, p2])

            expect(r1).toEqual({ balance: '100' })
            expect(r2).toEqual({ name: 'Alice' })

            // Single call to /batch
            expect(directRequest).toHaveBeenCalledTimes(1)
            expect(directRequest).toHaveBeenCalledWith('/batch', {
                method: 'POST',
                headers: { 'API-KEY': 'tok' },
                data: {
                    requests: [
                        { path: '/wallet/balance', method: 'POST', body: { wallet_id: 1 }, headers: { 'API-KEY': 'tok' } },
                        { path: '/partner/0', method: 'GET', headers: { 'API-KEY': 'tok' } },
                    ],
                },
            })
        })


        it('deduplicates identical requests: returns same promise', async () => {
            directRequest.mockResolvedValueOnce({ id: 42 })

            const p1 = queue.enqueue('/partner/0', {
                method: 'GET',
                headers: { 'API-KEY': 'tok' },
            })
            const p2 = queue.enqueue('/partner/0', {
                method: 'GET',
                headers: { 'API-KEY': 'tok' },
            })

            // Exact same promise object
            expect(p1).toBe(p2)

            await vi.advanceTimersByTimeAsync(0)

            // Single bypass (only 1 unique request)
            expect(directRequest).toHaveBeenCalledTimes(1)

            const result = await p1
            expect(result).toEqual({ id: 42 })
        })


        it('dedup + batch: 3 enqueues with 2 unique → batch of 2', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: 'a' },
                    { status: 200, body: 'b' },
                ],
            })

            const p1 = queue.enqueue('/foo', {
                method: 'GET',
                headers: { h: '1' },
            })
            const p2 = queue.enqueue('/bar', {
                method: 'GET',
                headers: { h: '1' },
            })
            const p3 = queue.enqueue('/foo', {
                method: 'GET',
                headers: { h: '1' },
            })

            expect(p1).toBe(p3)
            expect(p1).not.toBe(p2)

            await vi.advanceTimersByTimeAsync(0)

            expect(directRequest).toHaveBeenCalledTimes(1)
            const [r1, r2, r3] = await Promise.all([p1, p2, p3])
            expect(r1).toBe('a')
            expect(r2).toBe('b')
            expect(r3).toBe('a')
        })


        it('sub-response with status >= 400 rejects that promise only', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: { ok: true } },
                    { status: 401, body: { error: 'unauthorized' } },
                ],
            })

            const p1 = queue.enqueue('/good', {
                method: 'GET',
                headers: {},
            })
            const p2 = queue.enqueue('/bad', {
                method: 'GET',
                headers: {},
            })

            // Attach rejection handlers before flush to avoid
            // unhandled rejection warnings
            const a1 = expect(p1).resolves.toEqual({ ok: true })
            const a2 = expect(p2).rejects.toThrow('Batch sub-request failed')

            await vi.advanceTimersByTimeAsync(0)

            await a1
            await a2

            const err = await p2.catch(e => e)
            expect(err.code).toBe(401)
        })


        it('batch POST failure rejects all queued promises', async () => {
            directRequest.mockRejectedValueOnce(new Error('network down'))

            const p1 = queue.enqueue('/a', { method: 'GET', headers: {} })
            const p2 = queue.enqueue('/b', { method: 'GET', headers: {} })

            const a1 = expect(p1).rejects.toThrow('network down')
            const a2 = expect(p2).rejects.toThrow('network down')

            await vi.advanceTimersByTimeAsync(0)

            await a1
            await a2
        })


        it('single request failure rejects that promise', async () => {
            directRequest.mockRejectedValueOnce(new Error('timeout'))

            const p = queue.enqueue('/slow', { method: 'POST', headers: {} })

            const assertion = expect(p).rejects.toThrow('timeout')

            await vi.advanceTimersByTimeAsync(0)

            await assertion
        })


        it('queue resets after flush and can batch again', async () => {
            // First tick: single bypass
            directRequest.mockResolvedValueOnce({ first: true })
            const p1 = queue.enqueue('/first', { method: 'GET', headers: {} })
            await vi.advanceTimersByTimeAsync(0)
            expect(await p1).toEqual({ first: true })

            // Second tick: batch of 2
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: { second: true } },
                    { status: 200, body: { third: true } },
                ],
            })
            const p2 = queue.enqueue('/second', { method: 'GET', headers: {} })
            const p3 = queue.enqueue('/third', { method: 'GET', headers: {} })
            await vi.advanceTimersByTimeAsync(0)

            expect(await p2).toEqual({ second: true })
            expect(await p3).toEqual({ third: true })

            expect(directRequest).toHaveBeenCalledTimes(2)
        })


        it('does not include data/body for requests without data', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: 'a' },
                    { status: 200, body: 'b' },
                ],
            })

            queue.enqueue('/no-data', { method: 'GET', headers: {} })
            queue.enqueue('/with-data', {
                method: 'POST',
                headers: {},
                data: { key: 'val' },
            })

            await vi.advanceTimersByTimeAsync(0)

            const batchPayload = directRequest.mock.calls[0][1].data
            expect(batchPayload.requests[0]).not.toHaveProperty('body')
            expect(batchPayload.requests[1]).toEqual({
                path: '/with-data',
                method: 'POST',
                body: { key: 'val' },
                headers: {},
            })
        })


        it('includes per-sub-request headers in batch payload', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: { ok: true } },
                    { status: 200, body: { ok: true } },
                ],
            })

            queue.enqueue('/wallet/archived', {
                method: 'GET',
                headers: {
                    'API-KEY': 'tok',
                    'X-Lokapi-Caller-User-Uri': 'comchain://cc/user/0xa',
                    'X-Client-Features': 'wallet/0',
                },
            })
            queue.enqueue('/recipient/search_all', {
                method: 'GET',
                headers: {
                    'API-KEY': 'tok',
                    'X-Lokapi-Caller-User-Uri': 'comchain://cc/user/0xa',
                    'X-Client-Features': 'recipient/0',
                },
            })

            await vi.advanceTimersByTimeAsync(0)

            const batchPayload = directRequest.mock.calls[0][1].data
            expect(batchPayload.requests[0].headers).toEqual({
                'API-KEY': 'tok',
                'X-Lokapi-Caller-User-Uri': 'comchain://cc/user/0xa',
                'X-Client-Features': 'wallet/0',
            })
            expect(batchPayload.requests[1].headers).toEqual({
                'API-KEY': 'tok',
                'X-Lokapi-Caller-User-Uri': 'comchain://cc/user/0xa',
                'X-Client-Features': 'recipient/0',
            })
        })


        it('different headers on same path → not deduplicated', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    { status: 200, body: 'user-a' },
                    { status: 200, body: 'user-b' },
                ],
            })

            const p1 = queue.enqueue('/wallet/archived', {
                method: 'GET',
                headers: { 'X-Lokapi-Caller-User-Uri': 'comchain://cc/user/0xa' },
            })
            const p2 = queue.enqueue('/wallet/archived', {
                method: 'GET',
                headers: { 'X-Lokapi-Caller-User-Uri': 'comchain://cc/user/0xb' },
            })

            expect(p1).not.toBe(p2)

            await vi.advanceTimersByTimeAsync(0)

            const [r1, r2] = await Promise.all([p1, p2])
            expect(r1).toBe('user-a')
            expect(r2).toBe('user-b')

            const batchPayload = directRequest.mock.calls[0][1].data
            expect(batchPayload.requests).toHaveLength(2)
        })


        it('populates responseHeaders from sub-response headers', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    {
                        status: 200,
                        body: ['addr1'],
                        headers: {
                            'X-Supported-Features': 'wallet/0',
                            'X-Selected-Features': 'wallet/0',
                        },
                    },
                    { status: 200, body: { ok: true } },
                ],
            })

            const responseHeaders1: Record<string, any> = {}
            const responseHeaders2: Record<string, any> = {}

            const p1 = queue.enqueue('/wallet/archived', {
                method: 'GET',
                headers: { 'X-Client-Features': 'wallet/0' },
                responseHeaders: responseHeaders1,
            })
            const p2 = queue.enqueue('/partner/search', {
                method: 'GET',
                headers: {},
                responseHeaders: responseHeaders2,
            })

            await vi.advanceTimersByTimeAsync(0)
            await Promise.all([p1, p2])

            expect(responseHeaders1['X-Supported-Features']).toBe('wallet/0')
            expect(responseHeaders1['X-Selected-Features']).toBe('wallet/0')
            expect(responseHeaders2).toEqual({})
        })


        it('no crash when sub-response has headers but opts has no responseHeaders', async () => {
            directRequest.mockResolvedValueOnce({
                responses: [
                    {
                        status: 200,
                        body: { ok: true },
                        headers: { 'X-Selected-Features': 'wallet/0' },
                    },
                ],
            })

            // Single request → bypass, not batched.
            // Enqueue two so we get a real batch.
            const p1 = queue.enqueue('/wallet/archived', {
                method: 'GET',
                headers: { 'X-Client-Features': 'wallet/0' },
                // no responseHeaders
            })
            const p2 = queue.enqueue('/other', {
                method: 'GET',
                headers: {},
            })

            // Update mock for 2 responses
            directRequest.mockReset()
            directRequest.mockResolvedValueOnce({
                responses: [
                    {
                        status: 200,
                        body: { ok: true },
                        headers: { 'X-Selected-Features': 'wallet/0' },
                    },
                    { status: 200, body: { ok: true } },
                ],
            })

            await vi.advanceTimersByTimeAsync(0)

            // Should not throw
            const [r1, r2] = await Promise.all([p1, p2])
            expect(r1).toEqual({ ok: true })
            expect(r2).toEqual({ ok: true })
        })
    })
}
