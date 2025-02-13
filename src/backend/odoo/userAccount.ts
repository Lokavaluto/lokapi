import { BridgeObject } from '..'
import { t } from '../..'


export default class UserAccount extends BridgeObject {
    get isTopUpAllowed() {
        return this.jsonData?.is_topup_allowed !== false
    }
}
