import { cache, JsonKeyCacheStore, JsonKeyTTLCacheStore } from '@0k/cache'


export { cache }

export const ttlcache = cache({
    cacheStore: JsonKeyTTLCacheStore,
    key: (x: any) => x.args,
    noCacheOnReject: true,
})

export const singleton = cache({
    cacheStore: JsonKeyCacheStore,
    key: (x: any) => x.args,
    noCacheOnReject: true,
    cancelOnClear: true,
})
