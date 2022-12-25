import { arrayShuffler } from 'utils'

import type { KVNamespace, ExecutionContext } from '@cloudflare/workers-types'
import type { Table } from 'types'

export default {
  async fetch(
    request: Request,
    env: {
      TOKEN: string
      PEOPLE_PLAYING: string
      ADMIN_CHAT: string
      STORE: KVNamespace
    },
    _ctx: ExecutionContext
  ): Promise<Response> {
    const { TOKEN, PEOPLE_PLAYING, ADMIN_CHAT, STORE } = env

    const sendMessage = async (chatId: number, message: string) => {
      await fetch(
        `https://api.telegram.org/bot${TOKEN}/sendMessage?chat_id=${chatId}&text=${message}`
      )
    }

    const makeReply = (chatId: number) => async (message: string) => {
      await sendMessage(chatId, message)
    }
    const notifyAdmin = async (message: string) => {
      await sendMessage(parseInt(ADMIN_CHAT), message)
    }

    if (
      !request.headers.has('Content-Type'.toLowerCase()) ||
      !request.headers.get('Content-Type')!.includes('application/json')
    ) {
      return new Response('Not JSON')
    }

    const body = await request.json()

    if (!body.message) {
      return new Response('Ignoring these types of updates')
    }

    const chatId = body.message.chat.id
    const reply = makeReply(chatId)

    if (!body.message.from.username) {
      await reply('You need a username')
      return new Response('No username')
    }
    const username = body.message.from.username

    if (body.message.chat.id === ADMIN_CHAT && body.message.text === 'reset') {
      console.log('Resetting')
      await STORE.delete('table')
      console.log('Reset done')
      await notifyAdmin('Reset done')
      return new Response('Reset done')
    }

    await reply(`Hey ${username}!`)

    const isFull = (table: Table) =>
      Object.keys(table).length === parseInt(PEOPLE_PLAYING)

    const register = async (username: string, chatId: number) => {
      const table = await STORE.get('table')

      if (!table) {
        await reply('You are first! Adding you')
        await notifyAdmin(`No table yet, adding ${username}`)
        await STORE.put('table', JSON.stringify({ [username]: { chatId } }))
        return
      }

      const parsedTable: Table = JSON.parse(table)

      if (isFull(parsedTable)) {
        await reply('Secret Santa already completed, sorry!')
        return new Response('Already completed')
      }

      if (!parsedTable.hasOwnProperty(username)) {
        await reply('Adding you')
        await notifyAdmin(`${username} not in table, adding`)
        const newObject: Table = JSON.parse(table)

        newObject[username] = { chatId }

        await STORE.put('table', JSON.stringify(newObject))
        await notifyAdmin('Updated table')

        if (isFull(newObject)) {
          await notifyAdmin('Last user, triggerring generator')
          await triggerStart()
        }
      } else {
        await reply('You are already added!')
        return new Response('Already in the table')
      }
    }

    const triggerStart = async () => {
      console.log('Start initiated')

      const table = (await STORE.get('table'))!
      const data: Table = JSON.parse(table)

      const shuffled = Object.keys(data)
        .map((x) => ({ value: x, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((x) => x.value)

      const gifts = arrayShuffler(shuffled, 'gifts')
      const costumes = arrayShuffler(shuffled, 'costumes')
      await merge(gifts, costumes)
    }

    const merge = async (
      gifts: { [key: string]: string },
      costumes: { [key: string]: string }
    ) => {
      const store = (await STORE.get('table'))!
      const table: Table = JSON.parse(store)
      console.log('Merger initiated')

      const final = Object.fromEntries(
        Object.entries(table).map(([k, v], ix) => [
          k,
          {
            ...v,
            gift: gifts[ix],
            costume: costumes[ix],
          },
        ])
      )

      await STORE.put('table', JSON.stringify(final))

      for (const k of Object.keys(final)) {
        await sendMessage(
          final[k].chatId,
          `Hey ${k}, you get a gift for ${final[k].gift} and costume for ${final[k].costume}`
        )
      }
    }

    await register(username, chatId)

    return new Response('All good')
  },
}
