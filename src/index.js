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
      let queryString = url.substring(url.indexOf('?'))
      queryString = queryString.startsWith('?') ? queryString : ''
      const query = parseIteratorData(new URLSearchParams(queryString))

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
      let status, headers
      promise.then(res => {
        status = res.status
        headers = parseIteratorData(res.headers)
        return res.clone().json()
      }).then(data => {
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