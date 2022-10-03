import { mux } from './generator'


type Constructor = new (...args: any[]) => {}

export function Record<TBase extends Constructor> (Base: TBase, meta: any) {
    return class Record extends Base {
        public static async *mux (
            srcGens: Array<Generator | AsyncGenerator>,
            order: Array<string>
        ) {

            const orderFns = order.map((key) => {
                let reverse = false
                if (key.startsWith('-')) {
                    key = key.substring(1)
                    reverse = true
                } else if (key.startsWith('+')) {
                    key = key.substring(1)
                }
                const orderFn =
                    meta[key]?.order?.orderFn ||
                    ((x: any, y: any) => (x < y ? 1 : x > y ? -1 : 0))
                return reverse
                    ? (x: Record, y: Record) => -orderFn(x[key], y[key])
                    : (x: Record, y: Record) => orderFn(x[key], y[key])
            })
            yield* mux(srcGens, (x: Record, y: Record) => {
                for (const oFn of orderFns) {
                    const res = oFn(x, y)
                    if (res !== 0) return res
                }
                return 0
            })
        }
    }
}
