const { AttachmentBuilder, SlashCommandBuilder, EmbedBuilder, Client, Intents, PermissionBitField, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { randomInt } = require('crypto');
const debug = false;
async function ProcessPromptAndGrabImage(folderPath, interaction, promptContent, originalFilePath) {
    console.log("PPAGI Original file path: " + originalFilePath);
    debugLog("interaction.commandName:", interaction.commandName);
    const [promptJson, filename] = JsonBuilder(interaction, originalFilePath);
    debugLog("\n\n START PROCESSPROMPTANDGRABIMAGE \n\n");
    debugLog("/----------/");
    debugLog("/----------/");
    debugLog("/----------/");
    debugLog(JSON.stringify(promptJson, null, 2));
    debugLog("promptJson: " + promptJson);
    debugLog("folderPath: " + folderPath);
    debugLog("filename: " + filename);
    debugLog("interaction: " + interaction);
    debugLog("/----------/");
    debugLog("/----------/");
    debugLog("/----------/");
    debugLog('ProcessPromptAndGrabImage...');
    debugLog('Sending to axios...');

    const response = await axios.post('http://127.0.0.1:8188/prompt', { prompt: promptJson });

    await waitForImageAndSend(interaction, promptJson, folderPath, filename, promptContent, originalFilePath);

    //ws.on('message', async (data) => {
    //    debugLog("Parsing the JSON...");
    //    const message = JSON.parse(data);
    //    debugLog('Message:', message);
    //    debugLog('message.type:', message.type, " message.data.value:", message.data.value, " message.data.max:", message.data.max);
    //    if (message.type === 'status') {
    //        debugLog('Exec info:', message.data.status.exec_info);
    //        if (message.data.status.exec_info.queue_remaining === 0) {
    //            debugLog('Queue is empty...');
    //            debugLog('Trying to find the image with matching filename...');
    //            await wait(1000);
    //            debugLog('filename:', filename);
    //            debugLog('folderPath:', folderPath);

    //                ws.close();
    //            } else {
    //                debugLog('File not found in the output folder.');
    //            }
    //        }
    //    }
    //});

    //ws.on('error', (error) => {
    //    console.error('Websocket error:', error);
    //});

    //ws.on('close', () => {
    //    debugLog('Websocket closed.');
    //});
    debugLog("\n\n END PROCESSPROMPTANDGRABIMAGE \n\n");
}
async function EmbedReply(interaction, attachment, promptJson, folderPath, filename, originalPromptContent, originalAttachment, originalFilePath) {
    debugLog("\n\n START EMBEDREPLY \n\n");
    debugLog("EmbedReply...");
    let promptContent = PromptNameBuilder(interaction);
    if (originalPromptContent) {
        debugLog("We are in a repeat...");
        promptContent = originalPromptContent;
    }
    debugLog("Attachment inside the EmbedReply: " + attachment);
    //await interaction.deferReply({ ephemeral: true });
    //const prompt = interaction.options.getString('prompt');
    //debugLog("Prompt entered:" + prompt);
    //let fields = [
    //    { name: "this is also a test", value: "example value" },
    //];
    const currentDate = new Date();
    const uniqueId = (currentDate.getHours() * 3600000) + (currentDate.getMinutes() * 60000) + (currentDate.getSeconds() * 1000) + currentDate.getMilliseconds();
    const button = new ActionRowBuilder()
        .addComponents
        (
            new ButtonBuilder()
                .setCustomId('repeat-' + uniqueId)
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('dm-' + uniqueId)
                .setEmoji('📩')
                //.setEmoji(`:envelope:`)
                .setStyle(ButtonStyle.Secondary),
    )

    try {
        debugLog("Deleting pending reply...");
        await interaction.deleteReply();
    }
    catch (error) {
        debugLog(error);
    }
    //const followUpMessage = await interaction.followUp(
    //await interaction.user.send(
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
                    .setTitle(promptContent)
                    .setImage('attachment://image.png'),
            ],
            components: [button],
            files: filesArray,
        }
    );
    //const channel = interaction.channel;
    //const message = await channel.messages.fetch(followUpMessage.id);
    //await message.react('🔁');
    debugLog("Message sent, moving onto the collector...");
    const collector = interaction.channel.createMessageComponentCollector();

    collector.on('collect', async (i) => {
        debugLog("Entering collector...");
        debugLog("customID: " + i.customId);
        try {
            debugLog("Deferring a reply inside the collector...");
            await i.deferReply({ ephemeral: false });
        } catch (error) {
            debugLog(error);
        }
        if (i.customId === 'dm-' + uniqueId) {
            debugLog("Passed the dm check...");
            await i.user.send(
                {
                    content: `<@${i.user.id}>`,
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(promptContent)
                            .setImage('attachment://image.png'),
                        //.addFields(testPrompt),
                    ],
                    //fetchReply: true
                    //components: [button],
                    files: [attachment]
                }
            );
            await i.deleteReply();
            debugLog("Dm sent.");
        } else if (i.customId === 'repeat-' + uniqueId) {
            debugLog("Passed the repeat check...");
            debugLog("Invoking ProcessPromptAndGrabImage...");
            i.commandName = interaction.commandName;
            i.options = interaction.options;
            await ProcessPromptAndGrabImage(folderPath, i, promptContent, originalFilePath);

        }
    });
    debugLog("\n\n END EMBEDREPLY \n\n");
}

function PromptNameBuilder(interaction) {
    debugLog("\n\n START PROMPTNAMEBUILDER \n\n");
    debugLog("PromptNameBuilder...");
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
    debugLog("Finished building the prompt: " + promptToDisplay);
    debugLog("\n\n END PROMPTNAMEBUILDER \n\n");
    return promptToDisplay;

}

function JsonBuilder(interaction, originalFilePath) {
    console.log("JB Original file path: " + originalFilePath);
    const configFile = fs.readFileSync('./workflows.json', 'utf8');
    const allConfigs = JSON.parse(configFile);
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
        case 'nsfw':
            let promptJsonNsfw = allConfigs['nsfw'];
            let promptRequest = interaction.options.getString('prompt');
            switch (interaction.options.getString('lora')) {
                case 'doggy':
                    promptRequest += ", dggy, girl, pov, penis";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "doggy.safetensors";
                    break;
                case 'blowjob':
                    promptRequest += ", woman, sucking a cock";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "blowjob.safetensors";
                    break;
                case 'cum':
                    promptRequest += ", woman, cum on face";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "cum.safetensors";
                    break;
                case 'penis':
                    promptRequest += ", penisart, penis face, ball sack, hairy balls, penis veins, outlined, eyes, mouth, tail, arms, legs, hands, feet";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "penis.safetensors";
                    break;
                case 'ahegao':
                    promptRequest += ", tongue out, ahegao, drool";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "ahegao.safetensors";
                    break;
                case 'topless':
                    promptRequest += ", topless woman breasts";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "topless.safetensors";
                    break;
                case 'titsout':
                    promptRequest += ", boutx clothes";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "titsout.safetensors";
                    break;
                case 'greg':
                    promptRequest += ", greg rutkowski";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "greg.safetensors";
                    break;
                case 'chalkdust':
                    promptRequest += ", chalkdust";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "chalkdust.safetensors";
                    break;
                case 'icons':
                    promptRequest += ", icredm";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "icons.safetensors";
                    break;
                case 'logo':
                    promptRequest += ", LogoRedAF";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "logo.safetensors";
                    break;
                case 'bigass':
                    promptRequest += ", bottomheavy, big ass"; //, huge ass, gigantic ass, thick thighs, massive thighs";
                    promptJsonNsfw["10"]["inputs"]["lora_name"] = "bigass.safetensors";
                    break;

                default:
                    promptRequest = promptRequest;
            }

            promptJsonNsfw["18"]["inputs"]["text_positive"] = promptRequest;
            promptJsonNsfw["19"]["inputs"]["text_l"] = promptRequest;
            promptJsonNsfw["3"]["inputs"]["seed"] = Math.floor(Math.random() * 10000001);
            if (interaction.options.getNumber('cfg') != null) {
                promptJsonNsfw["3"]["inputs"]["cfg"] = interaction.options.getNumber('cfg');
            }
            if (interaction.options.getString('style') != null) {
                promptJsonNsfw["18"]["inputs"]["style"] = interaction.options.getString('style');
            }
            if (interaction.options.getString('negative') != null) {
                promptJsonNsfw["18"]["inputs"]["text_negative"] = interaction.options.getString('negative');
                promptJsonNsfw["20"]["inputs"]["text_l"] = interaction.options.getString('negative');
            }
            promptJsonNsfw["9"]["inputs"]["filename_prefix"] = formattedDate;
            return [promptJsonNsfw, formattedDate];
        case 'imgtoimg':
            let promptJsonImgToImg = allConfigs['imgtoimg'];
            promptJsonImgToImg["20"]["inputs"]["text_positive"] = interaction.options.getString('prompt');
            promptJsonImgToImg["2"]["inputs"]["text_l"] = interaction.options.getString('prompt');
            const randomSeed = generateRandomSeed();
            promptJsonImgToImg["6"]["inputs"]["seed"] = randomSeed;
            console.log("Original file path: " +originalFilePath);
            promptJsonImgToImg["11"]["inputs"]["image"] = originalFilePath;
            if (interaction.options.getString('negative') != null) {
                promptJsonImgToImg["20"]["inputs"]["text_negative"] = interaction.options.getString('negative');
                promptJsonImgToImg["4"]["inputs"]["text_l"] = interaction.options.getString('negative');
            }
            if (interaction.options.getNumber('cfg') != null) {
                promptJsonImgToImg["6"]["inputs"]["cfg"] = interaction.options.getNumber('cfg');
            }
            if (interaction.options.getNumber('noise') != null) {
                promptJsonImgToImg["6"]["inputs"]["denoise"] = interaction.options.getNumber('noise');
            }
            if (interaction.options.getString('style') != null) {
                promptJsonImgToImg["20"]["inputs"]["style"] = interaction.options.getString('style');
            }
            promptJsonImgToImg["14"]["inputs"]["filename_prefix"] = formattedDate;

            return [promptJsonImgToImg, formattedDate];
        case 'pixelart':
            let promptJsonPixelart = allConfigs['pixelart'];
            promptJsonPixelart["6"]["inputs"]["text"] = interaction.options.getString('prompt');
            promptJsonPixelart["10"]["inputs"]["noise_seed"] = Math.floor(Math.random() * 10000001);;
            if (interaction.options.getString('cfg') != null) {
                promptJsonPixelart["10"]["inputs"]["cfg"] = interaction.options.getString('cfg');
            }
            if (interaction.options.getString('negative') != null) {
                promptJsonPixelart["7"]["inputs"]["text"] = interaction.options.getString('negative');
            }
            promptJsonPixelart["19"]["inputs"]["filename_prefix"] = formattedDate;
            return [promptJsonPixelart, formattedDate];
        default:
            // Code to handle unknown commands
            break;
    }
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForImageAndSend(interaction, promptJson, folderPath, filename, promptContent, originalFilePath, maxAttempts = 600, intervalMs = 2000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const filePath = findFileWithFilename(folderPath, filename);
        if (filePath) {
            debugLog('File found:', filePath);
            const attachment = new AttachmentBuilder(filePath, 'image.png');
            if (originalFilePath) {
                const originalAttachment = new AttachmentBuilder(originalFilePath, 'original.png');
                await EmbedReply(interaction, attachment, promptJson, folderPath, filename, promptContent, originalAttachment, originalFilePath);
                return;
            }
            debugLog('Attachment: ' + attachment);
            debugLog('Invoking EmbedReply...');
            await EmbedReply(interaction, attachment, promptJson, folderPath, filename, promptContent);
            return;
        }
        // Image not found, wait for the specified interval
        await wait(intervalMs);
        attempts++;
    }

    console.log(`Image not found after ${maxAttempts} attempts.`);
}
function generateRandomSeed() {
    const originalSeed = 1041787352747838;
    const numberOfDigits = originalSeed.toString().length;

    const min = Math.pow(10, numberOfDigits - 1);
    const max = Math.pow(10, numberOfDigits) - 1;

    return Math.floor(Math.random() * (max - min + 1) + min);
}

function findFileWithFilename(folderPath, filename) {
    const files = fs.readdirSync(folderPath);
    const foundFile = files.find((file) => file.includes(filename));
    if (foundFile) {
        return path.join(folderPath, foundFile);
    }
    return null;
}
function findMostRecentImage(folderPath) {
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.png'));
    if (files.length === 0) {
        return null;
    }

    const recentFile = files.reduce((prev, curr) => {
        const prevPath = path.join(folderPath, prev);
        const currPath = path.join(folderPath, curr);
        const prevStats = fs.statSync(prevPath);
        const currStats = fs.statSync(currPath);
        return prevStats.mtimeMs > currStats.mtimeMs ? prev : curr;
    });

    return path.join(folderPath, recentFile);
}
function debugLog(message) {
    if (debug) {
        console.log(message);
    }
}
module.exports = { EmbedReply, ProcessPromptAndGrabImage };