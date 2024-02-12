const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { processPromptAndGrabImage, autocompleteGlobals } = require('../utils.js');
const config = require('../config.json');
const outputPath = config.outputPath;

//
// /dream
// has support for various loras and styles
// doesn't use SDXL refiner
//
module.exports = {
    //
    // Discord slash command stuff
    //
    data: new SlashCommandBuilder()
        .setName('dream')
        .setDescription('Dream of something incredible')
        .addStringOption(option => option.setName('prompt').setDescription('What you want to imagine').setRequired(true))
        .addStringOption(option => option.setName('lora').setDescription('Special action').setRequired(false).setAutocomplete(true))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false).setAutocomplete(true))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false))
        .addStringOption(option => option.setName('width').setDescription('Width of the image (default is 1024)').setRequired(false))
        .addStringOption(option => option.setName('height').setDescription('Height of the image (default is 1024)').setRequired(false))
        .addStringOption(option => option.setName('model').setDescription('Select the model').setRequired(false).setAutocomplete(true))
        .addStringOption(option => option.setName('style').setDescription('Style of the picture').setRequired(false).setAutocomplete(false)),
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
        await interaction.deferReply();
        processPromptAndGrabImage(outputPath, interaction);
    }
};