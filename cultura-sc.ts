import { Telegraf } from 'telegraf'
import { extract, FeedEntry } from '@extractus/feed-extractor'
import { SentEventsStorage } from './helper'

class TelegramSender {
    bot: Telegraf
    channel_id: string

    constructor(token: string, channel_id: string) {
        this.bot = new Telegraf(token)
        this.channel_id = channel_id
    }

    sendMessages(messages: FeedEntry[]): void {
        for (let message of messages) {
            const dateObj = new Date(message.published)
            const dayOptions: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                timeZone: 'America/Sao_Paulo'
            };
            
            const dateOptions: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'America/Sao_Paulo'
            };
            
            const timeOptions: Intl.DateTimeFormatOptions = {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            };
            
            const day = new Intl.DateTimeFormat('pt-BR', dayOptions).format(dateObj)
            const date = new Intl.DateTimeFormat('pt-BR', dateOptions).format(dateObj)
            const time = new Intl.DateTimeFormat('pt-BR', timeOptions).format(dateObj)
            
            const friendlyDate = `${day}, ${date} às ${time}`
            const text = `${message.title}\n${friendlyDate}\n${message.link}`
            console.log(text)
            this.bot.telegram.sendMessage(this.channel_id, `${message.title}\n${friendlyDate}\n${message.link}`)
        }
    }
}

const RSS_URLS = [
    "https://www.cultura.sc.gov.br/programacao/espacos/tac?format=feed&type=rss",
]
const TELEGRAM_TOKEN = process.env.VAMODALHE_TOKEN
const CHANNEL_ID = process.env.VAMODALHE_CHANNEL

async function main(): Promise<void> {
    if (TELEGRAM_TOKEN == undefined || CHANNEL_ID == undefined) {
        console.log("Invalid token!")
        return
    }
    let storage = new SentEventsStorage()
    await storage.loadEvents()

    for(const url of RSS_URLS) {
    let unsentEvents = await storage.filterOldEvents((await extract(url)).entries)
        if (unsentEvents.length > 0) {
            let sender = new TelegramSender(TELEGRAM_TOKEN, CHANNEL_ID)
            sender.sendMessages(unsentEvents)
            storage.saveEvents(unsentEvents)
        }
    }
}

main()
