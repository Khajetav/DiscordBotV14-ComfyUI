const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { processPromptAndGrabImage, autocompleteGlobals } = require('../utils.js');
const config = require('../config.json');
const outputPath = config.outputPath;
const inputPath = config.inputPath;

//
// /imgtoimg
// used for turning one image into another
//
module.exports = {
    //
    // Discord slash command stuff
    //
    data: new SlashCommandBuilder()
        .setName('imgtoimg')
        .setDescription('Change an image into another image')
        .addAttachmentOption(option => option.setName('image').setDescription('The image file').setRequired(true))
        .addStringOption(option => option.setName('prompt').setDescription('The positive prompt').setRequired(true))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false))
        .addNumberOption(option => option.setName('noise').setDescription('Noise value from 0 to 1').setRequired(false))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false))
        .addStringOption(option => option.setName('lora').setDescription('Special action').setRequired(false).setAutocomplete(true))
        .addStringOption(option => option.setName('style').setDescription('Style of the picture').setRequired(false).setAutocomplete(true)),
    //https://discordjs.guide/slash-commands/autocomplete.html#sending-results
    //
    // AUTOCOMPLETE HANDLING
    // may be expensive on the API requests, not sure, but is fairly easy to turn off
    // above turn setAutocomplete(true) into (false)
    // 
    async autocomplete(interaction) {
        autocompleteGlobals(interaction);
    },
            
    //
    // IMAGE PROCESSING LOGIC
    // interaction.deferReply() makes it so that Discord informs the user that the bot is thinking
    // if an interaction takes longer than 3 seconds then Discord forgets it, needs deferReply for longer ones
    // 
    async execute(interaction) {
        //
        // IMAGE DOWNLOADING
        // bit messy, but it downloads the stream of an image from Discord and forms it in your input path
        // which will be later on used in ComfyUI
        //
        await interaction.deferReply();
        const originalAttachment = interaction.options.getAttachment('image');
        const originalCurrentDate = new Date();
        const originalFormattedDate = `${originalCurrentDate.getFullYear()}-${(originalCurrentDate.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${originalCurrentDate.getDate().toString().padStart(2, '0')}_${originalCurrentDate
                .getHours()
                .toString()
                .padStart(2, '0')}-${originalCurrentDate.getMinutes().toString().padStart(2, '0')}-${originalCurrentDate
                    .getSeconds()
                    .toString()
                .padStart(2, '0')}-${originalCurrentDate.getMilliseconds().toString().padStart(3, '0')}`;
        const originalFileData = await fetch(originalAttachment.url).then(res => res.arrayBuffer());

        const originalBufferData = Buffer.from(originalFileData);
        const currentFileInputPath = inputPath + `${originalFormattedDate}.png`;
        try {
            fs.writeFile(currentFileInputPath, originalBufferData, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`File saved to ${currentFileInputPath}`);
                }
            });
        } catch (error) {
            console.error('An error occurred:', error);
        }
        console.log("execute Original file path: " + currentFileInputPath);
        processPromptAndGrabImage(outputPath, interaction, null, currentFileInputPath);
    }
}