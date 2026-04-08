import { cache, JsonKeyCacheStore } from '@0k/cache'


export const singleton = cache({
    cacheStore: JsonKeyCacheStore,
    key: (x: any) => x.args,
    noCacheOnReject: true,
})
