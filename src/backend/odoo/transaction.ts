import * as t from "../../type";

export class PlannedTransaction implements t.ITransaction {
  private opts: any;

  constructor(opts) {
    this.opts = opts;
  }

  get amount() {
    return this.opts.amount;
  }
  get currency() {
    return this.opts.currency;
  }
  get pending() {
    return null;
  }
  get date() {
    return null;
  }
  get description() {
    return this.opts.description;
  }
  get id() {
    return null;
  }
  get related() {
    return this.opts.related;
  }
  get isTopUp() {
    return false;
  }
  get isReconversion() {
    return false;
  }
  get tags() {
    return this.opts.tags || [];
  }

  execute() {
    let fn = this.opts.executeData.fn;
    let args = this.opts.executeData.args;
    return fn(...args);
  }
}
