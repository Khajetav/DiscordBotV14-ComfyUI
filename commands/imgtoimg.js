const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const { ProcessPromptAndGrabImage } = require('../utils.js');

module.exports = {
    //
    // Discord slash command stuff
    //


    data: new SlashCommandBuilder()
        .setName('imgtoimg')
        .setDescription('Change a pic into a different pic')
        .addAttachmentOption(option => option.setName('image').setDescription('The image file').setRequired(true))
        .addStringOption(option => option.setName('prompt').setDescription('The positive prompt').setRequired(true))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false))
        .addNumberOption(option => option.setName('noise').setDescription('Noise value from 0 to 1').setRequired(false))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false))
        .addStringOption(option => option.setName('style').setDescription('Style of the picture').setRequired(false).setAutocomplete(true)),
    //https://discordjs.guide/slash-commands/autocomplete.html#sending-results
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
        //const choices = ['sai-base', 'sai-3d-model', 'sai-analog film', 'sai-anime', 'sai-cinematic', 'sai-comic book', 'sai-craft clay', 'sai-digital art', 'sai-enhance', 'sai-fantasy art', 'sai-isometric', 'sai-line art', 'sai-lowpoly', 'sai-neonpunk', 'sai-origami', 'sai-photographic', 'sai-pixel art', 'sai-texture', 'ads-advertising', 'ads-automotive', 'ads-corporate', 'ads-fashion editorial', 'ads-food photography', 'ads-luxury', 'ads-real estate', 'ads-retail', 'artstyle-abstract', 'artstyle-abstract expressionism', 'artstyle-art deco', 'artstyle-art nouveau', 'artstyle-constructivist', 'artstyle-cubist', 'artstyle-expressionist', 'artstyle-graffiti', 'artstyle-hyperrealism', 'artstyle-impressionist', 'artstyle-pointillism', 'artstyle-pop art', 'artstyle-psychedelic', 'artstyle-renaissance', 'artstyle-steampunk', 'artstyle-surrealist', 'artstyle-typography', 'artstyle-watercolor', 'futuristic-biomechanical', 'futuristic-biomechanical cyberpunk', 'futuristic-cybernetic', 'futuristic-cybernetic robot', 'futuristic-cyberpunk cityscape', 'futuristic-futuristic', 'futuristic-retro cyberpunk', 'futuristic-retro futurism', 'futuristic-sci-fi', 'futuristic-vaporwave', 'game-bubble bobble', 'game-cyberpunk game', 'game-fighting game', 'game-gta', 'game-mario', 'game-minecraft', 'game-pokemon', 'game-retro arcade', 'game-retro game', 'game-rpg fantasy game', 'game-strategy game', 'game-streetfighter', 'game-zelda', 'misc-architectural', 'misc-disco', 'misc-dreamscape', 'misc-dystopian', 'misc-fairy tale', 'misc-gothic', 'misc-grunge', 'misc-horror', 'misc-kawaii', 'misc-lovecraftian', 'misc-macabre', 'misc-manga', 'misc-metropolis', 'misc-minimalist', 'misc-monochrome', 'misc-nautical', 'misc-space', 'misc-stained glass', 'misc-techwear fashion', 'misc-tribal', 'misc-zentangle', 'papercraft-collage', 'papercraft-flat papercut', 'papercraft-kirigami', 'papercraft-paper mache', 'papercraft-paper quilling', 'papercraft-papercut collage', 'papercraft-papercut shadow box', 'papercraft-stacked papercut', 'papercraft-thick layered papercut', 'photo-alien', 'photo-film noir', 'photo-hdr', 'photo-long exposure', 'photo-neon noir', 'photo-silhouette', 'photo-tilt-shift', 'sticker'];
    },
            

    async execute(interaction) {
        await interaction.deferReply();
        const originalFolderPath = 'C:\\Users\\kajus\\Desktop\\ComfyUI_windows_portable\\ComfyUI\\output';
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

        // Convert the ArrayBuffer to a Buffer
        const originalBufferData = Buffer.from(originalFileData);
        // C:\Users\kajus\Desktop\ComfyUI_windows_portable\ComfyUI\input
        const originalFilePath = `C:/Users/kajus/Desktop/ComfyUI_windows_portable/ComfyUI/input/${originalFormattedDate}.png`;
        try {
            // Save the image file to a temporary location

            fs.writeFile(originalFilePath, originalBufferData, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`File saved to ${originalFilePath}`);
                }
            });
        } catch (error) {
            console.error('An error occurred:', error);
        }
        console.log("execute Original file path: " + originalFilePath);
        ProcessPromptAndGrabImage(originalFolderPath, interaction, null, originalFilePath);
    }
}