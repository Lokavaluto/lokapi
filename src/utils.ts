import { TimeoutError } from './exception'


export function sleep (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}


export async function queryUntil (queryFn, untilPredicateFn,
                                  timeoutMs: number = 30000,
                                  queryEveryMs: number = 1000) {
    const startMs = (new Date().getTime()) / 100
    let counter = 0
    while (true) {
        const res = await queryFn()
        if (untilPredicateFn(res)) {
            console.log('predicate true! returning', res)
            return res
        }
        const nowMs = (new Date().getTime()) / 100
        if (nowMs >= startMs + timeoutMs) {
            throw new TimeoutError('Timeout reached')
        }
        await sleep(queryEveryMs)
        counter++
        console.log(`Re-trying query (retry nb ${counter}, ` +
            `time left: ${((timeoutMs - (nowMs - startMs)) / 1000).toFixed(2)}s)`)
    }
}

