import { Node } from 'node-red'
import puppeteer from 'puppeteer-extra'
import * as z from 'zod'
import { Actions, Events, Event } from './slack.common'

export type SetupArg = {
  node: Node
  accountName: string
  accountPassword: string
}

export function Setup(setupArg: SetupArg) {
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    switch (action.topic) {
      case 'SEND.V1': {
        const { message, channelLink } = action.payload
        const { node, accountName, accountPassword } = setupArg
        let browser

        try {
          browser = await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:3000' })
          const page = await browser.newPage()

          await page.goto(channelLink)
          node.log(`Navigating to ${channelLink}`)

          await page.focus('#email')
          await page.keyboard.type(accountName)
          node.log('Typing email')

          await page.focus('#password')
          await page.keyboard.type(accountPassword)
          node.log('Typing password')

          await Promise.all([page.click('#signin_btn'), page.waitForNavigation()])
          node.log(`Signing in`)

          await page.waitForTimeout(1000)

          const title = await page.$eval('title', (el: any) => el.textContent)
          if (title?.includes(`There's been a glitch`)) {
            throw `Invalid channel ${channelLink}`
          }

          // get archive id
          if (!channelLink.includes('/archives')) {
            throw 'Channel link should include /archives'
          }
          const archiveId = channelLink.substring(channelLink.search('/archives') + 10)
          node.log(`The channel's archive id is ${archiveId}`)

          // click open with browser link
          const browserSelector = `a[href='/messages/${archiveId}']`
          node.log(`Looking for \`${browserSelector}\``)
          await page.waitForSelector(browserSelector)
          await page.click(browserSelector)
          node.log(`Navigated to ${channelLink}`)

          // write and send messsage
          await page.waitForSelector('.ql-editor')
          node.log('Focus on message editor')
          await page.focus('.ql-editor')
          node.log('Typing message')
          await page.keyboard.type(message)
          node.log('Click send message button')
          await page.click('button[data-qa="texty_send_button"]')

          browser.disconnect()

          node.log(`Processed slack message to ${channelLink}`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Last processed send message to ${channelLink} ${time()}`,
          })
        } catch (e) {
          browser?.disconnect()
          const message = [`Error writing message to channelLink ${channelLink}`, JSON.stringify(e)].join('\n')

          send(Event.failed({ message }))

          node.error(message)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
        }

        return done()
      }
      default:
        done()
        break
    }
  }
}

function time() {
  return new Date().toISOString().substr(11, 5)
}
