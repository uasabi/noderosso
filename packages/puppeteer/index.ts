import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker'
import { Browser, ConnectOptions } from 'puppeteer-extra/dist/puppeteer'

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

export const connect: () => Promise<Browser> = async () => {
  return await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:3000' })
}
