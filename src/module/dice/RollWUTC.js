export default class RollWUTC extends Roll {
	get isSuccess() {
		if (!this._evaluated) return undefined;
		if (!Number.isNumeric(this.options.success)) return false;
		if (this.options.rollUnder) {
			return this.total <= this.options.success;
		}
		return this.total >= this.options.success;
	}
}
