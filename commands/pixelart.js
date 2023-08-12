const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { ProcessPromptAndGrabImage } = require('../utils.js');

module.exports = {
    //
    // Discord slash command stuff
    //
    data: new SlashCommandBuilder()
        .setName('pixelart')
        .setDescription('imagines pixelated tits')
        .addStringOption(option => option.setName('prompt').setDescription('What you want to imagine').setRequired(true))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false)),
    // https://discordjs.guide/slash-commands/autocomplete.html#sending-results
    async execute(interaction) {
        await interaction.deferReply();
        const folderPath = 'C:\\Users\\kajus\\Desktop\\ComfyUI_windows_portable\\ComfyUI\\output';
        ProcessPromptAndGrabImage(folderPath, interaction);
    }
}