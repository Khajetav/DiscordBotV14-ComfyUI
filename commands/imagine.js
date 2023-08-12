const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs'); 
const { ProcessPromptAndGrabImage } = require('../utils.js');

module.exports = {
    //
    // Discord slash command stuff
    //
    data: new SlashCommandBuilder()
        .setName('imagine')
        .setDescription('imagines tits')
        .addStringOption(option => option.setName('prompt').setDescription('What you want to imagine').setRequired(true))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false))
        .addStringOption(option => option.setName('style').setDescription('Style of the picture').setRequired(false).setAutocomplete(true)),
    // https://discordjs.guide/slash-commands/autocomplete.html#sending-results
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const jsonFilePath = 'C:/Users/kajus/Desktop/ComfyUI_windows_portable/ComfyUI/custom_nodes/sdxl_prompt_styler/sdxl_styles.json';
        try {
            const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
            const data = JSON.parse(jsonData);
            const choices = data.map(item => item.name);
            //const choices = ['sai-base', 'sai-3d-model', 'sai-lowpoly'];
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
        } catch (error) {
            console.error('Error reading/parsing the JSON file:', error);
        }
    },
    async execute(interaction) {
        await interaction.deferReply();
        const folderPath = 'C:\\Users\\kajus\\Desktop\\ComfyUI_windows_portable\\ComfyUI\\output';
        ProcessPromptAndGrabImage(folderPath, interaction);
    }
}
