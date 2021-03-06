import EndPoint from 'EndPoint'
var invariant = require('invariant')

const init = {
	processVars: () => {},
	processResult: (data) => data,
	defaultVars: {},
	autoFetch: false,
	fetchInterval: 0,
	endPoint: new EndPoint()
}

export default class QueryObject {
	constructor (initObj = init, mapDataToProps = () => {}) {
		let {
			query, defaultVars = init.defaultVars, processVars = init.processVars,
			processResult = init.processResult, endPoint = init.endPoint, autoFetch = init.autoFetch,
			fetchInterval = init.fetchInterval
		} = initObj

		invariant(typeof query === FUNCTION || typeof query === STRING,
		`expected "query" parameter type to be function or string, instead got ${typeof query}`)

		invariant(typeof defaultVars === OBJECT,
		`expected "defaultVars" parameter type to be function or object, instead got ${typeof defaultVars}`)

		invariant(typeof processVars === FUNCTION,
		`expected "processVars" parameter type to be function, instead got ${typeof processVars}`)

		invariant(typeof processResult === FUNCTION,
		`expected "processResult" parameter type to be function, instead got ${typeof processResult}`)

		invariant(typeof autoFetch === BOOLEAN,
		`expected "autoFetch" parameter type to be function or boolean, instead got ${typeof autoFetch}`)

		invariant(typeof fetchInterval === NUMBER || typeof fetchInterval === FUNCTION,
		`expected "fetchInterval" parameter type to be a number or function, instead got ${typeof fetchInterval}`)

		invariant(endPoint instanceof EndPoint,
		'Provided EndPoint parameter is invalid!.')

		invariant(typeof mapDataToProps === FUNCTION,
		`expected "mapDataToProps" parameter type to be function, instead got ${typeof mapDataToProps}`)

		this.__init = {...initObj}
		this._query = query
		this._defaultVars = defaultVars
		this._processVars = processVars
		this._processResult = processResult
		this._mapDataToProps = mapDataToProps
		this._autoFetch = autoFetch
		this._fetchInterval = typeof fetchInterval !== FUNCTION ? () => fetchInterval : fetchInterval
		this._endPoint = endPoint

		this._isFetching = false
		this._autoFetching = false
		this._data = void 0
		this._error = void 0
		this._autoFetchTimer = 0

		this.resolveQuery = this.resolveQuery.bind(this)
		this._setState = this._setState.bind(this)
		this.fetch = this.fetch.bind(this)
		this.autoFetch = this.autoFetch.bind(this)
		this.stopAutoFetch = this.stopAutoFetch.bind(this)
		this.isFetching = this.isFetching.bind(this)
		this.Data = this.Data.bind(this)
		this.Error = this.Error.bind(this)
	}

	resolveQuery (iVars) {
		// if "query" type is a function, procces variables
		return (typeof this._query === FUNCTION
		? this._query({...this._defaultVars, ...iVars, ...this._processVars(iVars, this._defaultVars)})
		: this._query)
		// TODO : minify query , AST or just regex ??
	}

	_setState (data, err, fetching = false) {
		this._data = data ? this._data : data
		this._error = err
		this._isFetching = fetching
		this._mapDataToProps(data)
	}

	ClearError () {
		this._error = void 0
		this._mapDataToProps()
	}

	fetch (vars) {
		return new Promise((resolve, reject) => {
			const _query = this.resolveQuery(vars)
			this._setState(void 0, void 0, true)
			this._endPoint.fetch(_query).then(
				(data) => {
					this._setState({...this._processResult(data)}, void 0)
					resolve(data)
				}
			).catch(
				(err) => {
					this._setState(void 0, err)
					reject(err)
				}
			)
		})
	}

	autoFetch (vars, interval) {
		return (hrep = () => {}, herr = () => {}) => {
			const oVars = typeof vars === FUNCTION ? vars() : {...vars}
			this._autoFetchTimer = setTimeout(() =>
				this.fetch(oVars)
				.then((data) =>
					(hrep(data) !== false) && this._autoFetchTimer && this.autoFetch(vars, interval)(hrep, herr))
				.catch((err) =>
					(herr(err) !== false) && this._autoFetchTimer && this.autoFetch(vars, interval)(hrep, herr)),
			!this._autoFetchTimer && 1 || interval || this._fetchInterval())

			return this.stopAutoFetch
		}
	}

	stopAutoFetch () {
		clearTimeout(this._autoFetchTimer)
		this._autoFetchTimer = 0
	}

	isFetching () {
		return this._isFetching
	}

	Data () {
		return this._data
	}

	Error () {
		return this._error
	}
}
