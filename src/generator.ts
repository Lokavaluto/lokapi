

export async function * mux (
    pagerGens: Array<Generator | AsyncGenerator>,
    order: (x: any, y: any) => number) {
    // Parallel resolve of all promises
    const allHeads = await Promise.all(
        pagerGens.map((gen) => Promise.resolve(gen.next())))
    const genHeads = pagerGens.map((gen, idx) => ({ head: allHeads[idx], gen }))
        .filter((v) => !v.head.done)
        .sort((x, y) => order(x.head.value, y.head.value))

    let bestCandidate: any
    while ((bestCandidate = genHeads.shift())) {
        const { head, gen } = bestCandidate
        yield head.value
        const next = await gen.next()
        if (!next.done) { // must replace gen in right position
            let pos = 0
            while (pos < genHeads.length &&
                (order(next.value, genHeads[pos].head.value) > 0)) {
                pos++
            }
            genHeads.splice(pos, 0, { head: next, gen })
        }
    }
}


