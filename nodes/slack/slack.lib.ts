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
        const { message, channel, workspace } = action.payload
        const { node, accountName, accountPassword } = setupArg
        let browser

        try {
          const url = `https://${workspace}.slack.com`
          browser = await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:3000' })
          const page = await browser.newPage()

          await page.goto(url)
          const title = await page.$eval('title', (el) => el.textContent)
          if (title?.includes(`There's been a glitch`)) {
            throw `Workspace ${workspace} not found.`
          }

          await page.focus('#email')
          await page.keyboard.type(accountName)

          await page.focus('#password')
          await page.keyboard.type(accountPassword)

          await Promise.all([page.click('#signin_btn'), page.waitForNavigation()])

          await page.waitForTimeout(1000)

          // select specific channel
          const selector = `//span[@data-qa='channel_sidebar_name_${channel}']/parent::div/parent::div`
          await page.waitForXPath(selector)
          const [targetElement] = await page.$x(selector)
          if (!targetElement) {
            throw `Specified channel's name ${channel} dom element not found.`
          }
          await targetElement.click()

          // write and send messsage
          await page.waitForSelector('.ql-editor')
          await page.focus('.ql-editor')
          await page.keyboard.type(message)
          await page.click('button[data-qa="texty_send_button"]')

          browser.disconnect()

          node.log(`Processed slack message to ${channel}`)
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `Last processed ${workspace}: ${action.payload.channel} ${time()}`,
          })
        } catch (e) {
          browser?.disconnect()
          const message = [`Error writing message to channel ${channel}`, JSON.stringify(e)].join('\n')

          send(Event.failed({ message }))

          node.error(message)
          node.status({ fill: 'red', shape: 'dot', text: `Error ${time()}` })
        }

        return done()
      }
      default:
        break
    }
  }
}

function time() {
  return new Date().toISOString().substr(11, 5)
}
