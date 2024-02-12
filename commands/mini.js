const { SlashCommandBuilder } = require('discord.js');
const { processPromptAndGrabImage, autocompleteGlobals } = require('../utils.js');
const { spawn } = require('child_process');
const { AttachmentBuilder, EmbedBuilder, Client, Intents, PermissionBitField, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
//
// /mini
// dalle-min model
//
module.exports = {
    //
    // Discord slash command stuff
    //
    data: new SlashCommandBuilder()
        .setName('mini')
        .setDescription('dreams up of an image')
        .addStringOption(option => option.setName('prompt').setDescription('What you want to imagine').setRequired(true)),
    //
    // IMAGE PROCESSING LOGIC
    // interaction.deferReply() makes it so that Discord informs the user that the bot is thinking
    // if an interaction takes longer than 3 seconds then Discord forgets it, needs deferReply for longer ones
    // 
    async execute(interaction) {
        interaction.deferReply();
        const prompt = interaction.options.getString('prompt');
        const currentDate = new Date();
        const outputPath = "C:\\Users\\kajus\\Desktop\\DiscordBot";
        const fileName = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}_${currentDate
                .getHours()
                .toString()
                .padStart(2, '0')}-${currentDate.getMinutes().toString().padStart(2, '0')}-${currentDate
                    .getSeconds()
                    .toString()
                .padStart(2, '0')}-${currentDate.getMilliseconds().toString().padStart(3, '0')}`;
        const pythonScript = 'C:\\Users\\kajus\\Desktop\\DalleeMini\\image_from_text.py';
        const args = [
            pythonScript,
            `--text=${prompt}`,        // Assuming 'prompt' contains a valid value
            '--no-mega',
            `--image-path=${fileName}` // Assuming 'fileName' contains a valid value
        ];

        const childProcess = spawn('py', args);
        let attempts = 0;
        const maxAttempts = 100;
        let filePath = false;
        const delay = 2000; // Delay in milliseconds (2 seconds in this example)
        function doWork() {
            console.log("Attempt " + attempts);
            const files = fs.readdirSync(outputPath);
            const foundFile = files.find((file) => file.includes(fileName));
            let filePath;

            if (foundFile) {
                filePath = path.join(outputPath, foundFile);
            }

            if (filePath) {
                console.log('File found:', filePath);
                const attachment = new AttachmentBuilder(filePath, 'image.png');
                let promptContent = prompt;
                try {
                    console.log("Deleting pending reply...");
                    interaction.deleteReply();
                }
                catch (error) {
                    console.log(error);
                }
                console.log("Sending a message...");
                let filesArray = [attachment];
                interaction.channel.send(
                    {
                        content: `<@${interaction.user.id}>` + ", your image is here!",
                        embeds: [
                            new EmbedBuilder()
                                .setDescription('/mini prompt:' + promptContent)
                                .setImage('attachment://image.png'),
                        ],
                        //components: [button],
                        files: filesArray,
                    }
                );
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(doWork, delay);
            }
        }

        doWork(); // Start the loop

    }
}
