import { BridgeObject } from '..'
import { t } from '../..'


export default class UserAccount extends BridgeObject {
    get isTopUpAllowed() {
        if(this.jsonData?.is_topup_allowed === false) {
            return false
        } else {
            return true
        }
    }
}
