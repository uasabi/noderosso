import Axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios'
import humanInterval from 'human-interval'
import { ClientRequest } from 'http'

export { AxiosResponse } from 'axios'

export const axios: AxiosInstance = Axios.create({
  headers: {
    DNT: '1',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,it;q=0.7',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Referer: 'https://www.google.com/',
    Cookie: 'foo=bar;bar=foo',
  },
  timeout: humanInterval('30 seconds')!,
})

export const axiosAsGoogleBot: AxiosInstance = Axios.create({
  headers: {
    DNT: '1',
    // from https://github.com/monperrus/crawler-user-agents/blob/master/crawler-user-agents.json
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8,it;q=0.7',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Referer: 'https://www.google.com/',
    Cookie: 'foo=bar;bar=foo',
  },
  timeout: humanInterval('30 seconds')!,
})

export function prettyAxiosErrors(error: AxiosError) {
  return <T>({
    not200,
    noResponse,
    orElse,
  }: {
    not200: (response: AxiosResponse) => T
    noResponse: (request: ClientRequest) => T
    orElse: (errorMessage: string) => T
  }): T => {
    if (error.response) {
      /*
       * The request was made and the server responded with a
       * status code that falls out of the range of 2xx
       */
      return not200.call(null, error.response)
    } else if (error.request) {
      /*
       * The request was made but no response was received, `error.request`
       * is an instance of XMLHttpRequest in the browser and an instance
       * of http.ClientRequest in Node.js
       */
      return noResponse.call(null, error.request)
    } else {
      // Something happened in setting up the request and triggered an Error
      return orElse.call(null, error.message)
    }
  }
}
