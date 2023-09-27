export async function md5(something: any): Promise<string> {
    const hasher = new Bun.CryptoHasher("sha256")
    hasher.update(JSON.stringify(something))
    return hasher.digest("hex").toString()
}

export class SentEventsStorage {
    filename: string
    entries: string[]

    constructor(filename: string = "sent_events") {
        let path = Bun.main.split('/')
        path.pop()
        this.filename = `${path.join('/')}/${filename}`
        console.log(`db: ${this.filename}`)
        this.entries = []
    }

    async loadEvents() {
        let file = Bun.file(this.filename)
        let text = await file.exists() ? await file.text() : ''
        this.entries = text.split('\n')
    }

    async filterOldEvents(events: any[]): Promise<any[]> {
        console.log(events)
        const hashedEvents = await Promise.all(events.map(async (event) => [event, await md5(event)]))
        return hashedEvents.filter((eventTuple) => !this.entries.includes(eventTuple[1])).map((eventTuple) => eventTuple[0])
    }

    async saveEvents(events: any[]): Promise<void> {
        const current_entries: string[] = await Promise.all(events.map(async event => md5(event)))
        this.entries = [...this.entries, ...current_entries].slice(-100)
        Bun.write(this.filename, this.entries.join('\n'))
    }
}