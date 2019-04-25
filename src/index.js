const R = require('ramda')

function watcher(fetch, Watcher) {
  window.fetch = (...args) => {
    const url = args[0]
    const config = args[1]
    const shouldWatch = url !== Watcher.global.origin+'/receiver'
    const { emitReq, emitRes } = Watcher()
    if (shouldWatch) {
      const headers = config && config.headers || {}
      const method = config && config.method || 'GET'
      const query = parseIteratorData(new URLSearchParams(url))

      let data = {}
      if (config) {
        const body = config.body
        if (body instanceof FormData) {
          data = parseIteratorData(body)
        }
        try {
          data = JSON.parse(body)
        } catch (e) {
          data = {_body: body}
        }
      }

      const params = R.mergeAll([query, data])
      emitReq({headers, method, url, params}).catch(console.error)
    }
    const promise = fetch(...args)
    if (shouldWatch) {
      promise.then(res => {
        const status = res.status
        const data = res.json()
        const headers = parseIteratorData(res.headers)
        emitRes({status, headers, data}).catch(console.error)
      })
    }
    return promise
  }
}

function parseIteratorData(iteratorData) {
  const data = {}
  for (let pair of iteratorData.entries()) {
    data[pair[0]] = pair[1]
  }
  return data
}

export default R.curry(watcher)