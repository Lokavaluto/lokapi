import { BridgeObject } from '..'
import { t } from '../..'


export default abstract class UserAccount extends BridgeObject {

    abstract internalId: string

    get isTopUpAllowed() {
        return this.jsonData?.is_topup_allowed !== false
    }

}
