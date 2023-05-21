# hagrids-ears-bot
Discord bot that listens

## Usage:
- Just invite the bot to your server and let it exist and it will collect data

- To start message recording send the following command (admin user): ```$startMessages```

- To pause message recording send the following command (admin user): ```$stopMessages```

- To start voice channel recording send the following command (admin user): ```$startVoice```

- To stop voice channel recording send the following command (admin user): ```$stopVoice```

## Requirements:

### **users.json & voice-users.json:**
- JSON map  that contains the userId's and names of the users who are eligible to record.
- ```users.json``` contains the users who are eligible for text chat recording
- ```voice-users.json``` contains the users who are eligible for voice chat recording
- example:
```json
{
    "someUserId": "name",
    "someOtherUserId": "name"
}
```

### **.env:**
- [dotenv](https://www.npmjs.com/package/dotenv) file that contains environment variables for sensitive values you don't want floating around in the codebase. Every single key must have a value for the bot to function properly.
- layout:
```toml
DEVELOPMENT_MODE=           # true / false
DISCORD_TOKEN_TEST=         # discord test bot token
DISCORD_TOKEN=              # discord bot token
AWS_REGION=                 # desired AWS region (i.e. us-east-2)
MESSAGE_BATCH_SIZE=         # desired message batch size (i.e. 100)
MESSAGE_DATA_BUCKET=        # name of the S3 bucket where you want to store message data
VOICE_DATA_BUCKET=          # name of the S3 bucket where you want to store voice data
VOICE_RECORDING_BUCKET=     # name of the S3 bucket where you want to store voice recordings
TOPIC_NAME=                 # SNS topic name
TOPIC_ARN=                  # SNS topic arn
ADMIN_USER_ID=              # discord user ID of the admin user
```

## Disclaimer:
Users of this bot are responsible for their own actions in gathering / processing / and using the data that this bot collects. Do not record text or voice logs of people without their permission. I take no responsibility for any misuse of this bot or the data collected by this bot by anybody who chooses to use it.
