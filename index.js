const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages] });
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

//
// INDEX
// here we get a list of commands, make requests to Discord's API
// also implemented short rate limiter thing as my bot was hitting the hourly rate limit quite often even with just
// 4 people spamming it
// hosting everything locally, no replit
//
// -----------------------------------------------
 //configExample.json has examples of what you need
 //token = this is your bot's password, found in https://discord.com/developers/applications
 //clientId = this is your application ID found in https://discord.com/developers/applications under your bot,
 //something like "1045437306321238123",
 //guildId = your server's ID, you can get this by enabling developer tools on Discord and right clicking
 //the server you want and selecting copy server ID,
 //outputPath = where your ComfyUI will store physical copies of images that it generates
 //inputPath = where your ComfyUI will take the images from for imgtoimg processing
 //jsonFilePath = custom node for ComfyUI that allows to use SDXL style prompts
 //I have added some of mine there too
//
const { token } = require('./config.json');
fs.writeFileSync('pidfile', process.pid.toString());

client.once(Events.ClientReady, () => {
    console.log('Ready!');
});

//
// INTERACTION QUEUE
// needed at times during heavy load in order to prevent being rate limited
//
const interactionQueue = [];
let isProcessingQueue = false;
async function processInteractionQueue() {
    console.log("Entering the queue");
    if (isProcessingQueue || interactionQueue.length === 0) {
        console.log("Queue is empty");
        return;
    }

    isProcessingQueue = true;
    console.log("Shifting the queue...");
    const interaction = interactionQueue.shift(); 
    console.log("Queue is now: " + interactionQueue);
    try {
        console.log("Trying to execute the command...");
        if (interaction.isChatInputCommand()) {
            console.log("Passed the isChatInputCommand if check...");
            const command = client.commands.get(interaction.commandName);
            console.log("Command entered: " + command);

            if (!command) {
                console.log('Command was not found');
                return;
            }
            console.log("Executing the command...");
            await command.execute(interaction);
            console.log("Executed the interaction: " + interaction);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        console.log("Finally statement");
        console.log("isProcessingQueue: " + isProcessingQueue);
        isProcessingQueue = false;
        setTimeout(processInteractionQueue, 1000); 
    }
}

client.on(Events.InteractionCreate, async interaction => {
    console.log("New interaction created: " + interaction);
    if (interaction.isAutocomplete()) {
        console.log("Autocomplete interaction, sending the commands..."); 
        const command = client.commands.get(interaction.commandName);

        if (!command || !command.autocomplete) {
            console.error(`No autocomplete handler was found for the ${interaction.commandName} command.`);
            return;
        }

        try {
            console.log("Autocomplete try");
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.isChatInputCommand()) {
        console.log("Chat input command interaction");
        interactionQueue.push(interaction);
        console.log("Pushed the interaction to the queue: " + interactionQueue);
        if (!isProcessingQueue) {
            console.log("Processing the queue...");
            processInteractionQueue();
        }
    }
});

client.login(token);