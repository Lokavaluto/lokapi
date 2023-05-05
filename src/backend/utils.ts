
/** Password checking utilities */

const PASSWORD_REGEX = {
    tooShort: (size: number) => RegExp(`.{${size},}`),
    noUpperCase: /[A-Z]/,
    noLowerCase: /[a-z]/,
    noDigit: /[0-9]/,
    noSymbol: /[^A-Za-z0-9]/,

}


export function makePasswordChecker (
    checks: Array<String>
): (password: string) => Array<string> {
    return (password) => {
        const issues = []
        checks.forEach((checkStr) => {
            const [checkId, argsStr] = checkStr.split(':')
            const args = (argsStr || '').split(',')
            let check = PASSWORD_REGEX[checkId]
            if (!check) {
                throw new Error(`Invalid check identifier ${checkId}`)
            }
            check = check instanceof RegExp ? check : check.apply(null, [args])

            if (!check.test(password)) issues.push(checkStr)
        })
        return issues
    }
}
