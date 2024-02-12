const { AttachmentBuilder, SlashCommandBuilder, EmbedBuilder, Client, Intents, PermissionBitField, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { jsonFilePath } = require('./config.json');
let styleChoices
if (!styleChoices) {
    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonData);
    styleChoices = data.map(item => item.name);
}
const loraChoices = ['ussrart', 'gloomy', 'timjacobs', 'wlop', 'chibi', 'foodpets', 'logo', 'icons', 'chalkdust',
    'greg', 'pixelart', 'voxel', 'jasmine', 'dragon', 'giger', 'rubbercup', 'apocalypse', 'oilpainting',
    'film', 'belle', 'beyondthedark', 'serafini', 'aethercloud', 'frazetta',
    'school', 'eggleston', 'circuit', 'alchemy', 'pixelred', 'pixelgba', 'pixellah', 'pixelgameicon',
    'pixellucasarts', 'pixelkairo', 'pixeluo', 'pixelgenshinicon', 'kitsune', 'cctv',
    'pixelsoft'];
const modelChoices = ['animebluepencil', 'cursed', 'detailedface', 'dreamshaper', 'hephaistos',
    'sdxlbase', 'talmen', 'albedo', 'crystalclear', 'zavy', 'counterfeit', 'dynavision', 'think', 'protovision', 'pixelwave',
    'furtastic', 'icedcoffee', 'furryfantasy','envy','cartoonreal', 'turbo'];
//
// UTILITIES FILE
// this is where I store most of my functions
// and handle inner API calls between the bot and ComfyUI
//
// turn debug into true if you want to see additional console logging
//
const debug = false; 

//
// autocompleteGlobals
// handles the Discord autocompletion feature
// but it's fairly expensive on the API requests so idk if I should keep it
// but it's really nice to have
//
async function autocompleteGlobals(interaction) {
    const focusedValue = interaction.options.getFocused();
    const focusedOption = interaction.options.getFocused(true);
    const choiceMap = {
        'style': styleChoices,
        'lora': loraChoices,
        'model': modelChoices
    };

    try {
        const choices = choiceMap[focusedOption.name] || [];
        const filtered = choices.filter(choice => choice.startsWith(focusedValue));
        const options = filtered.slice(0, 25); // Discord can only display 25 options at a time

        await interaction.respond(options.map(choice => ({ name: choice, value: choice })));
    } catch (error) {
        interaction.deleteReply();
        interaction.channel.send({
            content: "Something went wrong with the autoprediction.\n" + promptText,
        });
        console.error('Error reading/parsing the JSON file:', error);
    }
}

//
// processPromptAndGrabImage
// the first function that gets run
// jsonBuilder formats the prompt to be sent to ComfyUI
// then waitForImageAndSend turns on a while loop that checks the output folder for the generated image
// you can theoretically wait for events but I couldn't figure out how to reliably listen to them
// when there is more than one request at a time
//
async function processPromptAndGrabImage(outputPath, interaction, promptContent, originalFilePath) {
    if (autocorrect(interaction) === 0) {
        return;
    }
    const [promptJson, filename] = jsonBuilder(interaction, originalFilePath);
    debugLog("\n\n processPromptAndGrabImage START \n\n");
    debugLog("interaction.commandName:", interaction.commandName);
    debugLog('processPromptAndGrabImage...');
    debugLog('Sending the prompt to ComfyUI...');
    try {
        const response = await axios.post('http://127.0.0.1:8188/prompt', {
            prompt: promptJson
        });
    } catch (e) {
        let promptText = promptNameBuilder(interaction);
        interaction.deleteReply();
        interaction.channel.send({
            content: "Bot is currently sleeping, try /mini or just fucking ping me lol\n" + promptText,
        });
    }
    await waitForImageAndSend(interaction, promptJson, outputPath, filename, promptContent, originalFilePath);
    debugLog("\n\n END processPromptAndGrabImage \n\n");
}

//
// autocorrect
// used for fixing user typed mistakes so that they don't crash the bot
// user gets yelled at for mistyping
//
function autocorrect(interaction) {
    const loraOption = interaction.options.getString('lora');
    const styleOption = interaction.options.getString('style');
    const modelOption = interaction.options.getString('model');
    let promptContent = promptNameBuilder(interaction);
    try {
        if (styleOption && !styleChoices.includes(styleOption)) {
            interaction.deleteReply();
            interaction.channel.send({
                content: `<@${interaction.user.id}>` + ", you've selected an invalid style!\n" + promptContent,
            });
            return 0;
        }
        else if (loraOption && !loraChoices.includes(loraOption)) {
            interaction.deleteReply();
            interaction.channel.send({
                content: `<@${interaction.user.id}>` + ", you've selected an invalid lora!\n" + promptContent,
            });
            return 0;
        }
        else if (modelOption && !modelChoices.includes(modelOption)) {
            interaction.deleteReply();
            interaction.channel.send({
                content: `<@${interaction.user.id}>` + ", you've selected an invalid model!\n" + promptContent,
            });
            return 0;
        }
    } catch (error) {
        console.error(error);
    }
}
//
// jsonBuilder
// ComfyUI needs workflows to know what it needs to do
// these workflows get sent as a JSON file
// in order to process Discord users' requests we need to turn their slash commands
// into valid JSON prompts
//
function jsonBuilder(interaction, originalFilePath) {
    debugLog("\n\n jsonBuilder START \n\n");
    // I store all of my workflows in workflows.json, should be included with the commit
    const configFile = fs.readFileSync('./workflows.json', 'utf8');
    // allConfigs is just pretty much the entire configFile we read from workflows.json
    const allConfigs = JSON.parse(configFile);
    // I use formattedDate to set unique names for images
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}_${currentDate
            .getHours()
            .toString()
            .padStart(2, '0')}-${currentDate.getMinutes().toString().padStart(2, '0')}-${currentDate
                .getSeconds()
                .toString()
            .padStart(2, '0')}-${currentDate.getMilliseconds().toString().padStart(3, '0')}`;

    //
    // SWITCH-CASE for commands
    // handles various workflow related JSON logic
    //
    switch (interaction.commandName) {
        case 'imagine':
            let promptJsonImagine = allConfigs['imagine'];
            promptJsonImagine["15"]["inputs"]["text"] = interaction.options.getString('prompt');
            promptJsonImagine["49"]["inputs"]["text_positive"] = interaction.options.getString('prompt');
            promptJsonImagine["50"]["inputs"]["text_l"] = interaction.options.getString('prompt');
            promptJsonImagine["10"]["inputs"]["noise_seed"] = Math.floor(Math.random() * 10000001);
            if (interaction.options.getNumber('cfg') != null) {
                promptJsonImagine["10"]["inputs"]["cfg"] = interaction.options.getNumber('cfg');
            }
            if (interaction.options.getString('style') != null) {
                promptJsonImagine["49"]["inputs"]["style"] = interaction.options.getString('style');
            }
            if (interaction.options.getString('negative') != null) {
                promptJsonImagine["16"]["inputs"]["text"] = interaction.options.getString('negative');
                promptJsonImagine["49"]["inputs"]["text_negative"] = interaction.options.getString('negative');
                promptJsonImagine["51"]["inputs"]["text_l"] = interaction.options.getString('negative');
            }

            promptJsonImagine["19"]["inputs"]["filename_prefix"] = formattedDate;
            return [promptJsonImagine, formattedDate];
        case 'dream':
            let promptJsonDream = allConfigs['dream'];
            let promptRequest = interaction.options.getString('prompt');
            if (interaction.options.getString('lora')) {
                promptJsonDream["10"]["inputs"]["lora_name"] = interaction.options.getString('lora') + ".safetensors";
            }
            if (interaction.options.getString('model')) {
                promptJsonDream["15"]["inputs"]["ckpt_name"] = interaction.options.getString('model') + ".safetensors";
            }
            if (interaction.options.getString('width')) {
                promptJsonDream["5"]["inputs"]["width"] = interaction.options.getString('width');
            }
            if (interaction.options.getString('height')) {
                promptJsonDream["5"]["inputs"]["height"] = interaction.options.getString('height');
            }
            switch (interaction.options.getString('lora')) {
                case 'greg':
                    promptRequest += ", greg rutkowski";
                    break;
                case 'chalkdust':
                    promptRequest += ", chalkdust";
                    break;
                case 'icons':
                    promptRequest += ", icredm";
                    break;
                case 'logo':
                    promptRequest += ", LogoRedAF";
                    break;
                case 'wlop':
                    promptRequest += ", impasto, wlop";
                    break;
                case 'timjacobs':
                    promptRequest += ", tim jacobus style painting, extensive color palette, balance of warm and cool tones, visually appealing, detailed shading and lighting, depth, soft shadows, bright highlights, Utilize classic oil painting techniques to paint a horrifying picture.";
                    break;
                case 'chibi':
                    promptRequest += ", chibi";
                    break;
                case 'gloomy':
                    promptRequest += ", gloomy, yinan";
                    break;
                case 'foodpets':
                    promptRequest += ", foodpets";
                    break;
                case 'ussrart':
                    promptRequest += ", ussrart";
                    break;
                case 'rubbercup':
                    promptRequest += ", Rubberhose Style";
                    break;
                case 'jasmine':
                    promptRequest += ", jsmn style";
                    break;
                case 'voxel':
                    promptRequest += ", voxel style";
                    break;
                case 'dragon':
                    promptRequest += ", DTstyle";
                    break;
                case 'giger':
                    promptRequest += ", (((g1g3r)))";
                    break;
                case 'film':
                    promptRequest += ", filmic";
                    break;
                case 'oilpainting':
                    promptRequest += ", bichu, oil painting";
                    break;
                case 'apocalypse':
                    promptRequest += ", SZ_4poXL enviroment";
                    break;
                case 'belle':
                    promptRequest += ", Belle Delphine";
                    break;
                case 'beyondthedark':
                    promptRequest += ", beyond_the_black_rainbow";
                    break;
                case 'serafini':
                    promptRequest += ", Serafini Style";
                    break;
                case 'aethercloud':
                    promptRequest += ", it looks like a photo of a cloud";
                    break;
                case 'frazetta':
                    promptRequest += ", fr4z3tt4";
                    break;
                case 'school':
                    promptRequest += ", kyoshitsu, kaidan, rouka";
                    break;
                case 'eggleston':
                    promptRequest += ", william eggleston";
                    break;
                case 'circuit':
                    promptRequest += ", 3l3ctronics";
                    break;
                case 'alchemy':
                    promptRequest += ", alchemy";
                    break;
                case 'pixelred':
                    promptRequest += ", Pixel Art, PixArFK";
                    break;
                case 'pixellah':
                    promptRequest += ", pixel art, pixel";
                    break;
                case 'pixeluo':
                    promptRequest += ", Pixelate  Game Play, 2D, 16bit, pixels, UOStyle, Ultima Online, pixelate, fantasy, Top Down, RPG, D&D, Textures, SNES, NES, video games";
                    break;
                case 'pixelkairo':
                    promptRequest += ", kairo, pixel art";
                    break;
                case 'pixellucasarts':
                    promptRequest += ", lcas artstyle";
                    break;
                case 'pixelgenshinicon':
                    promptRequest += ", game icon";
                    break;
                case 'pixelgameicon':
                    promptRequest += ", 2d icon";
                    break;
                case 'kitsune':
                    promptRequest += ", kitsune";
                    break;
                case 'cctv':
                    promptRequest += ", cctvfootage";
                    break;
                case 'pixelsoft':
                    promptRequest += ", pixel art";
                    break;
                default:
                    promptRequest = promptRequest;
            }
            promptJsonDream["18"]["inputs"]["text_positive"] = promptRequest;
            promptJsonDream["19"]["inputs"]["text_l"] = promptRequest;
            promptJsonDream["3"]["inputs"]["seed"] = Math.floor(Math.random() * 10000001);
            if (interaction.options.getNumber('cfg') != null) {
                promptJsonDream["3"]["inputs"]["cfg"] = interaction.options.getNumber('cfg');
            }
            if (interaction.options.getString('style') != null) {
                promptJsonDream["18"]["inputs"]["style"] = interaction.options.getString('style');
            }
            if (interaction.options.getString('negative') != null) {
                promptJsonDream["18"]["inputs"]["text_negative"] = interaction.options.getString('negative');
                promptJsonDream["20"]["inputs"]["text_l"] = interaction.options.getString('negative');
            }
            promptJsonDream["9"]["inputs"]["filename_prefix"] = formattedDate;
            return [promptJsonDream, formattedDate];
        case 'imgtoimg':
            let promptJsonImgToImg = allConfigs['imgtoimg'];
            let promptImgToImg = interaction.options.getString('prompt');
            if (interaction.options.getString('width')) {
                promptJsonImgToImg["9"]["inputs"]["side_length"] = interaction.options.getString('width');
            }
            if (interaction.options.getString('height')) {
                promptJsonImgToImg["9"]["inputs"]["side_length"] = interaction.options.getString('height');
            }
            if (interaction.options.getString('model')) {
                promptJsonImgToImg["1"]["inputs"]["ckpt_name"] = interaction.options.getString('model') + ".safetensors";
            }
            const randomSeed = generateRandomSeed();
            promptJsonImgToImg["4"]["inputs"]["seed"] = randomSeed;
            console.log("Original file path: " +originalFilePath);
            promptJsonImgToImg["8"]["inputs"]["image"] = originalFilePath;
            promptJsonImgToImg["11"]["inputs"]["filename_prefix"] = formattedDate;
            if (interaction.options.getString('negative') != null) {
                promptJsonImgToImg["15"]["inputs"]["Text"] = interaction.options.getString('negative');
            }
            if (interaction.options.getNumber('cfg') != null) {
                promptJsonImgToImg["4"]["inputs"]["cfg"] = interaction.options.getNumber('cfg');
            }
            if (interaction.options.getNumber('noise') != null) {
                promptJsonImgToImg["4"]["inputs"]["denoise"] = interaction.options.getNumber('noise');
            }
            if (interaction.options.getString('style') != null) {
                promptJsonImgToImg["12"]["inputs"]["style"] = interaction.options.getString('style');
            }
            if (interaction.options.getString('lora')) {
                promptJsonImgToImg  ["16"]["inputs"]["lora_name"] = interaction.options.getString('lora')+".safetensors";
            }
            switch (interaction.options.getString('lora')) {
                case 'greg':
                    promptImgToImg += ", greg rutkowski";
                    break;
                case 'chalkdust':
                    promptImgToImg += ", chalkdust";
                    break;
                case 'icons':
                    promptImgToImg += ", icredm";
                    break;
                case 'logo':
                    promptImgToImg += ", LogoRedAF";
                    break;
                case 'wlop':
                    promptImgToImg += ", impasto, wlop";
                    break;
                case 'timjacobs':
                    promptImgToImg += ", tim jacobus style painting, extensive color palette, balance of warm and cool tones, visually appealing, detailed shading and lighting, depth, soft shadows, bright highlights, Utilize classic oil painting techniques to paint a horrifying picture.";
                    break;
                case 'chibi':
                    promptImgToImg += ", chibi";
                    break;
                case 'gloomy':
                    promptImgToImg += ", gloomy, yinan";
                    break;
                case 'foodpets':
                    promptImgToImg += ", foodpets";
                    break;
                case 'ussrart':
                    promptImgToImg += ", ussrart";
                    break;
                case 'rubbercup':
                    promptImgToImg += ", Rubberhose Style";
                    break;
                case 'jasmine':
                    promptImgToImg += ", jsmn style";
                    break;
                case 'voxel':
                    promptImgToImg += ", voxel style";
                    break;
                case 'dragon':
                    promptImgToImg += ", DTstyle";
                    break;
                case 'giger':
                    promptImgToImg += ", g1g3r";
                    break;
                case 'film':
                    promptImgToImg += ", filmic";
                    break;
                case 'oilpainting':
                    promptImgToImg += ", bichu, oil painting";
                    break;
                case 'apocalypse':
                    promptImgToImg += ", SZ_4poXL enviroment";
                    break;
                case 'belle':
                    promptImgToImg += ", Belle Delphine";
                    break;
                case 'beyondthedark':
                    promptImgToImg += ", beyond_the_black_rainbow";
                    break;
                case 'serafini':
                    promptImgToImg += ", Serafini Style";
                    break;
                case 'aethercloud':
                    promptImgToImg += ", it looks like a photo of a cloud";
                    break;
                case 'frazetta':
                    promptImgToImg += ", fr4z3tt4";
                    break;
                case 'school':
                    promptImgToImg += ", kyoshitsu, kaidan, rouka";
                    break;
                case 'eggleston':
                    promptImgToImg += ", william eggleston";
                    break;
                case 'circuit':
                    promptImgToImg += ", 3l3ctronics";
                    break;
                case 'alchemy':
                    promptImgToImg += ", alchemy";
                    break;
                case 'pixelred':
                    promptImgToImg += ", Pixel Art, PixArFK";
                    break;
                case 'pixellah':
                    promptImgToImg += ", pixel art, pixel";
                    break;
                case 'pixeluo':
                    promptImgToImg += ", Pixelate  Game Play, 2D, 16bit, pixels, UOStyle, Ultima Online, pixelate, fantasy, Top Down, RPG, D&D, Textures, SNES, NES, video games";
                    break;
                case 'pixelkairo':
                    promptImgToImg += ", kairo, pixel art";
                    break;
                case 'pixellucasarts':
                    promptImgToImg += ", lcas artstyle";
                    break;
                case 'pixelgenshinicon':
                    promptImgToImg += ", game icon";
                    break;
                case 'pixelgameicon':
                    promptImgToImg += ", 2d icon";
                    break;
                case 'cctv':
                    promptImgToImg += ", cctvfootage";
                    break;
                case 'pixelsoft':
                    promptImgToImg += ", pixel art";
                    break;
                default:
                    promptImgToImg = promptImgToImg;
            }
            promptJsonImgToImg["14"]["inputs"]["Text"] = promptImgToImg;
            return [promptJsonImgToImg, formattedDate];
    }
    debugLog("\n\n jsonBuilder END \n\n");
}

//
// waitForImageAndSend
// checks every 2 seconds 600 times for a file to pop up in our output folder with the expected name
// can probably do this in a smarter way but I found that this works best for me
//
async function waitForImageAndSend(interaction, promptJson, outputPath, filename, promptContent, originalFilePath, maxAttempts = 600, intervalMs = 2000) {
    debugLog("\n\n waitForImageAndSend START \n\n");
    let attempts = 0;
    while (attempts < maxAttempts) {
        const filePath = findFileWithFilename(outputPath, filename);
        if (filePath) {
            debugLog('File found:', filePath);
            const attachment = new AttachmentBuilder(filePath, 'image.png');
            if (originalFilePath) {
                const originalAttachment = new AttachmentBuilder(originalFilePath, 'original.png');
                await embedReply(interaction, attachment, promptJson, outputPath, filename, promptContent, originalAttachment, originalFilePath);
                return;
            }
            debugLog('Attachment: ' + attachment);
            debugLog('Invoking embedReply...');
            await embedReply(interaction, attachment, promptJson, outputPath, filename, promptContent);
            debugLog("\n\n waitForImageAndSend END \n\n");
            return;
        }
        await wait(intervalMs);
        attempts++;
    }

    console.log(`Image not found after ${maxAttempts} attempts.`);
}

//
// promptNameBuilder
// grabs info from the interaction and builds it into a displayable string
//
function promptNameBuilder(interaction) {
    debugLog("\n\n promptNameBuilder START \n\n");
    let promptToDisplay = "";
    promptToDisplay = "/" + interaction.commandName + " prompt:" + interaction.options.getString('prompt') + " ";
    if (interaction.options.getNumber('cfg')) {
        promptToDisplay += "cfg:" + interaction.options.getNumber('cfg') + " ";
    }
    if (interaction.options.getString('negative')) {
        promptToDisplay += "negative:" + interaction.options.getString('negative') + " ";
    }
    if (interaction.options.getString('style')) {
        promptToDisplay += "style:" + interaction.options.getString('style') + " ";
    }
    if (interaction.options.getNumber('noise')) {
        promptToDisplay += "noise:" + interaction.options.getNumber('noise') + " ";
    }
    if (interaction.options.getString('lora')) {
        promptToDisplay += "lora:" + interaction.options.getString('lora') + " ";
    }
    if (interaction.options.getString('model')) {
        promptToDisplay += "model:" + interaction.options.getString('model') + " ";
    }
    if (interaction.options.getString('width')) {
        promptToDisplay += "width:" + interaction.options.getString('width') + " ";
    }
    if (interaction.options.getString('height')) {
        promptToDisplay += "height:" + interaction.options.getString('height') + " ";
    }
    debugLog("Finished building the prompt: " + promptToDisplay);
    debugLog("\n\n END promptNameBuilder \n\n");
    return promptToDisplay;

}

//
// embedReply
// used for creating a proper looking embedded reply according to the original prompt
// promptNameBuilder builds up a string from various slash command options that the user sent
// so that you can copy and paste it easily
//
async function embedReply(interaction, attachment, promptJson, outputPath, filename, originalPromptContent, originalAttachment, originalFilePath) {
    debugLog("\n\n embedReply START \n\n");
    let promptContent = promptNameBuilder(interaction);
    if (originalPromptContent) {
        debugLog("We are in a repeat...");
        promptContent = originalPromptContent;
    }
    debugLog("Attachment inside the embedReply: " + attachment);
    const currentDate = new Date();
    const uniqueId = (currentDate.getHours() * 3600000) + (currentDate.getMinutes() * 60000) + (currentDate.getSeconds() * 1000) + currentDate.getMilliseconds();
    //const button = new ActionRowBuilder()
    //    .addComponents
    //    (
    //        new ButtonBuilder()
    //            .setCustomId('repeat-' + uniqueId)
    //            .setEmoji('🔄')
    //            .setStyle(ButtonStyle.Secondary),
    //        new ButtonBuilder()
    //            .setCustomId('dm-' + uniqueId)
    //            .setEmoji('📩')
    //            .setStyle(ButtonStyle.Secondary),
    //)

    try {
        debugLog("Deleting pending reply...");
        await interaction.deleteReply();
    }
    catch (error) {
        debugLog(error);
    }
    debugLog("Sending a message...");
    let filesArray = [attachment];
    if (originalAttachment) {
        filesArray.push(originalAttachment);
    }
    await interaction.channel.send(
        {
            content: `<@${interaction.user.id}>` + ", your image is here!",
            embeds: [
                new EmbedBuilder()
                    .setDescription(promptContent)
                    .setImage('attachment://image.png'),
            ],
            //components: [button],
            files: filesArray,
        }
    );
    debugLog("Message sent, moving onto the collector...");
    //const collector = interaction.channel.createMessageComponentCollector();

    //collector.on('collect', async (i) => {
    //    debugLog("Entering collector...");
    //    debugLog("customID: " + i.customId);
    //    try {
    //        debugLog("Deferring a reply inside the collector...");
    //        await i.deferReply({ ephemeral: false });
    //    } catch (error) {
    //        debugLog(error);
    //    }
    //    if (i.customId === 'dm-' + uniqueId) {
    //        debugLog("Passed the dm check...");
    //        await i.user.send(
    //            {
    //                content: `<@${i.user.id}>`,
    //                embeds: [
    //                    new EmbedBuilder()
    //                        .setDescription(promptContent)
    //                        .setImage('attachment://image.png'),
    //                ],
    //                files: [attachment]
    //            }
    //        );
    //        await i.deleteReply();
    //        debugLog("Dm sent.");
    //    } else if (i.customId === 'repeat-' + uniqueId) {
    //        debugLog("Passed the repeat check...");
    //        debugLog("Invoking processPromptAndGrabImage...");
    //        i.commandName = interaction.commandName;
    //        i.options = interaction.options;
    //        await processPromptAndGrabImage(outputPath, i, promptContent, originalFilePath);

    //    }
    //});
    debugLog("\n\n embedReply END \n\n");
}


//
// HELPER FUNCTIONS
// pay no attention to these
//
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomSeed() {
    const originalSeed = 1041787352747838;
    const numberOfDigits = originalSeed.toString().length;

    const min = Math.pow(10, numberOfDigits - 1);
    const max = Math.pow(10, numberOfDigits) - 1;

    return Math.floor(Math.random() * (max - min + 1) + min);
}

function findFileWithFilename(outputPath, filename) {
    const files = fs.readdirSync(outputPath);
    const foundFile = files.find((file) => file.includes(filename));
    if (foundFile) {
        return path.join(outputPath, foundFile);
    }
    return null;
}
function findMostRecentImage(outputPath) {
    const files = fs.readdirSync(outputPath).filter(file => file.endsWith('.png'));
    if (files.length === 0) {
        return null;
    }

    const recentFile = files.reduce((prev, curr) => {
        const prevPath = path.join(outputPath, prev);
        const currPath = path.join(outputPath, curr);
        const prevStats = fs.statSync(prevPath);
        const currStats = fs.statSync(currPath);
        return prevStats.mtimeMs > currStats.mtimeMs ? prev : curr;
    });

    return path.join(outputPath, recentFile);
}
function debugLog(message) {
    if (debug) {
        console.log(message);
    }
}

//
// EXPORTS
// if you want to use a function outside of this file then you need to export it here 
//
module.exports = { embedReply, processPromptAndGrabImage, autocompleteGlobals };