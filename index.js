const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
fs.writeFileSync('pidfile', process.pid.toString());
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
    console.log('Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
    //
    // AUTOCOMPLETE HANDLING
    // 
    //
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command || !command.autocomplete) {
            console.error(`No autocomplete handler was found for the ${interaction.commandName} command.`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }

    // Check if it's a chat input command interaction
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        //console.log(command);

        if (!command) {
            console.log('Command was not found');
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error:', error);

            if (!interaction.deleted) {
                if (error instanceof CommandError) {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                    }
                }
                else {
                    console.error('An unexpected error occurred:', error);
                    await interaction.reply({ content: 'An unexpected error occurred while processing your request!', ephemeral: true });
                }
            } else {
                console.log('Interaction was deleted; unable to send error message.');
            }
        }
    }
});


client.login(token);