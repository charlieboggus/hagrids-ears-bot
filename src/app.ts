import { Client } from 'discord.js'
import ready from './listeners/ready'
import * as dotenv from 'dotenv'
dotenv.config()

const token = process.env.DISCORD_TOKEN

const client = new Client({
    intents: []
})
ready(client)
client.login(token)
