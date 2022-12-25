# Secret Sonta

This is a Secret Santa Telegram bot you can deploy yourself.

Compared to the original Secret Santa, this bot rolls not only to whom you buy a gift, but also a costume.

It runs on [Cloudflare Workers](https://workers.cloudflare.com), which has a free plan.

## Setting Up

### Bot

1. Register a bot with [BotFather](https://t.me/BotFather) in order to get a token.

### Worker

1. Create a new Cloudflare Worker.
2. Add environment variables to it, use `sample.env` for an example. It's necessary to push 'encrypt' for each added env var as otherwise they will be considered variables and not secrets.

### Bot Webhook

When you get your bot url, make a [setWebhook](https://core.telegram.org/bots/api#setwebhook) request to Telegram Bot API to indicate where bot updates need to be pushed to.

### Deployment

1. Create a Cloudflare API token.
2. Set it as `CF_API` GitHub Action secret.
