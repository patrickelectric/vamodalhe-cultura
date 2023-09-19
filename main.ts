import { Telegraf } from 'telegraf'
import { extract, FeedData, FeedEntry } from '@extractus/feed-extractor'
import { BunFile } from 'bun'
import { privateEncrypt } from 'crypto'

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

async function md5(something: any): Promise<string> {
    const hasher = new Bun.CryptoHasher("sha256")
    hasher.update(JSON.stringify(something))
    return hasher.digest("hex").toString()
}

class SentEventsStorage {
    filename: string
    entries: string[]

    constructor(filename: string = "sent_events") {
        let path = Bun.main.split('/')
        path.pop()
        this.filename = `${path.join('/')}/${filename}`
        console.log(`db: ${this.filename}`)
        this.entries = []
    }

    async saveEvents(entries: FeedEntry[]): Promise<void> {
        let current_entries: string[] = await Promise.all(entries.map(async entry => md5(entry)))
        this.entries = [...this.entries, ...current_entries].slice(-100)
        Bun.write(this.filename, this.entries.join('\n'))
    }

    async loadEvents() {
        let file = Bun.file(this.filename)
        let text = await file.exists() ? await file.text() : ''
        this.entries = text.split('\n')
    }

    async filterOldEvents(feed: FeedData): Promise<FeedEntry[]> {
        const events = await Promise.all(feed.entries?.map(async (entry: FeedEntry) => [entry, await md5(entry)]))
        return events.filter((event) => !this.entries.includes(event[1])).map((event) => event[0])
    }
}

const RSS_URLS = [
    "https://www.cultura.sc.gov.br/programacao/espacos/tac?format=feed&type=rss",
]
const TELEGRAM_TOKEN = process.env.VAMODALHE_TOKEN
const CHANNEL_ID = "@dalhe_cultura_floripa"

async function main(): Promise<void> {
    if (TELEGRAM_TOKEN == undefined) {
        console.log("Invalid token!")
        return
    }
    let storage = new SentEventsStorage()
    await storage.loadEvents()

    for(const url of RSS_URLS) {
    let unsentEvents = await storage.filterOldEvents(await extract(url))
        if (unsentEvents.length > 0) {
            let sender = new TelegramSender(TELEGRAM_TOKEN, CHANNEL_ID)
            sender.sendMessages(unsentEvents)
            storage.saveEvents(unsentEvents)
        }
    }
}

main()
