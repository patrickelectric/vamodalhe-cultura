import { Telegraf } from 'telegraf'
import { SentEventsStorage } from './helper'

class TelegramSender {
    bot: Telegraf
    channel_id: string

    constructor(token: string, channel_id: string) {
        this.bot = new Telegraf(token)
        this.channel_id = channel_id
    }

    sendEvent(event: any): void {
        const dateObj = new Date(parseInt(event.start))
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
        const day = new Intl.DateTimeFormat('pt-BR', dayOptions).format(dateObj)
        const date = new Intl.DateTimeFormat('pt-BR', dateOptions).format(dateObj)

        const startTime = `${event.startHour}:${String(event.startMinutes).padStart(2, '0')}`;
        const endTime = `${event.endHour}:${String(event.endMinutes).padStart(2, '0')}`;
        const timeSpan = `${startTime}-${endTime}`;
        
        const friendlyDate = `${day}, ${date} ${timeSpan}`
        let text = `[Camerata] ${event.title}\n${friendlyDate}\n${event.location}`
        
        if(event.links && event.links[0] && event.links[0].url) {
            text += `\n${event.links[0].url}`
        }
        
        console.log(text)
        this.bot.telegram.sendMessage(this.channel_id, text)
    }
}

const TELEGRAM_TOKEN = process.env.VAMODALHE_TOKEN
const CHANNEL_ID = process.env.VAMODALHE_CHANNEL
const URL = 'https://inffuse.eventscalendar.co/js/v0.1/calendar/data?compId=comp-lj92iwxq&instance=iINu7zg_1KrRf6JQv022qmhfEj66yhD5Fz9C9AvZ32E.eyJpbnN0YW5jZUlkIjoiMTNkZDQ0NzktMzg4MC01OGJjLTdmZjQtOWRmMDBhYjE1MzhhIiwiYXBwRGVmSWQiOiIxMzNiYjExZS1iM2RiLTdlM2ItNDliYy04YWExNmFmNzJjYWMiLCJzaWduRGF0ZSI6IjIwMjMtMDktMjdUMDA6Mzk6NTcuMzU0WiIsImRlbW9Nb2RlIjpmYWxzZSwiYWlkIjoiZDY5MjljMjItMDkxYy00YjM1LWJkZmMtNDY2YjgyM2Q1MDEwIiwic2l0ZU93bmVySWQiOiJkODg4OGQxMS1jNjIxLTQ4ZTMtOGI2OC05ZWQwMTRlYzhiODMifQ'

async function main(): Promise<void> {
    if (TELEGRAM_TOKEN == undefined || CHANNEL_ID == undefined) {
        console.log("Invalid token!")
        return
    }
    
    const jsonData = await (await fetch(URL)).json();
    
    const events = jsonData.project.data.events;
    
    let storage = new SentEventsStorage("save_events_camerata")
    await storage.loadEvents()
    
    let unsentEvents = await storage.filterOldEvents(events)
    if (unsentEvents.length > 0) {
        let sender = new TelegramSender(TELEGRAM_TOKEN, CHANNEL_ID)
        for(const event of unsentEvents) {
            sender.sendEvent(event)
        }
        storage.saveEvents(unsentEvents)
    }
}

main()