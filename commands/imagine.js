const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs'); 
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { randomInt } = require('crypto');

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
        // prompt is what the user types in Discord
        // can expand this later on to take style too
        const prompt = interaction.options.getString('prompt');
        const cfg = interaction.options.getNumber('cfg');
        const negative = interaction.options.getString('negative');
        const style = interaction.options.getString('style');
        console.log('Prompt received...');
        console.log(prompt);

        // deferReply is needed for when the loading time is longer than 3 seconds
        // but can edit it only once (probably can edit more than once but need some other code for it)
        await interaction.deferReply();

        // promptJson is the message that we send through API
        // we edit this with what the user has sent to the prompt and then it forwards the info to ComfyUI
        let promptJson = {
            "4": {
                "inputs": {
                    "ckpt_name": "xl6HEPHAISTOSSD10XLSFW_v10.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "10": {
                "inputs": {
                    "add_noise": "enable",
                    "noise_seed": 570665753905807,
                    "steps": 25,
                    "cfg": 10,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "start_at_step": 0,
                    "end_at_step": 20,
                    "return_with_leftover_noise": "enable",
                    "model": [
                        "4",
                        0
                    ],
                    "positive": [
                        "50",
                        0
                    ],
                    "negative": [
                        "51",
                        0
                    ],
                    "latent_image": [
                        "5",
                        0
                    ]
                },
                "class_type": "KSamplerAdvanced"
            },
            "11": {
                "inputs": {
                    "add_noise": "disable",
                    "noise_seed": 0,
                    "steps": 25,
                    "cfg": 8,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "start_at_step": 20,
                    "end_at_step": 10000,
                    "return_with_leftover_noise": "disable",
                    "model": [
                        "12",
                        0
                    ],
                    "positive": [
                        "15",
                        0
                    ],
                    "negative": [
                        "16",
                        0
                    ],
                    "latent_image": [
                        "10",
                        0
                    ]
                },
                "class_type": "KSamplerAdvanced"
            },
            "12": {
                "inputs": {
                    "ckpt_name": "sd_xl_refiner_1.0.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "15": {
                "inputs": {
                    "text": "positive prompt",
                    "clip": [
                        "12",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "16": {
                "inputs": {
                    "text": "",
                    "clip": [
                        "12",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "17": {
                "inputs": {
                    "samples": [
                        "11",
                        0
                    ],
                    "vae": [
                        "12",
                        2
                    ]
                },
                "class_type": "VAEDecode"
            },
            "19": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": [
                        "17",
                        0
                    ]
                },
                "class_type": "SaveImage"
            },
            "49": {
                "inputs": {
                    "text_positive": "positive prompt",
                    "text_negative": "",
                    "style": "sai-base",
                    "log_prompt": "No"
                },
                "class_type": "SDXLPromptStyler"
            },
            "50": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "crop_w": 0,
                    "crop_h": 0,
                    "target_width": 1024,
                    "target_height": 1024,
                    "text_g": [
                        "49",
                        0
                    ],
                    "text_l": "positive prompt",
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "CLIPTextEncodeSDXL"
            },
            "51": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "crop_w": 0,
                    "crop_h": 0,
                    "target_width": 1024,
                    "target_height": 1024,
                    "text_g": [
                        "49",
                        1
                    ],
                    "text_l": "",
                    "clip": [
                        "4",
                        1
                    ]
                },
                "class_type": "CLIPTextEncodeSDXL"
            }
        };

        // this is how we change parts of the Json
        promptJson["15"]["inputs"]["text"] = prompt;
        promptJson["49"]["inputs"]["text_positive"] = prompt;
        promptJson["50"]["inputs"]["text_l"] = prompt;
        const randomInt = Math.floor(Math.random() * 10000001);
        promptJson["10"]["inputs"]["noise_seed"] = randomInt;
        if (cfg != null) {
            promptJson["10"]["inputs"]["cfg"] = cfg;
        }
        if (style != null) {
            promptJson["49"]["inputs"]["style"] = style;
        }
        if (negative != null) {
            promptJson["16"]["inputs"]["text"] = negative;
            promptJson["49"]["inputs"]["text_negative"] = negative;
            promptJson["51"]["inputs"]["text_l"] = negative;
        }
        // format the date as a string (YYYY-MM-DD_HH-mm-ss)
        // we use this to give an unique name to files
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
        let filename = formattedDate;
        // set the filename prefix
        promptJson["19"]["inputs"]["filename_prefix"] = filename;
        // TODO: make relative paths
        // TODO: move project out of desktop lmao
        const folderPath = 'C:\\Users\\kajus\\Desktop\\ComfyUI_windows_portable\\ComfyUI\\output';

        // it's possible to get the image through the web socket, but it's a bit buggy
        async function getImage(filename, subfolder, folderType) {
            // Add the number to the filename
            const response = await axios.get(`http://127.0.0.1:8188/view?filename=${filename}_00001_.png&subfolder=&type=output`, { responseType: 'arraybuffer' });
            return response.data;
        }

        // POST request with the prompt and config
        console.log('Sending to axios...');
        const response = await axios.post('http://127.0.0.1:8188/prompt', { prompt: promptJson });
        const promptId = response.data.prompt_id;
        console.log('Opening websocket...');
        const ws = new WebSocket(`ws://127.0.0.1:8188/ws?clientId=${promptId}`);
        console.log('Sending websocket data...');
        // communicating with the websocket
        try {
            ws.on('message', async (data) => {
                const message = JSON.parse(data);
                console.log('Message:', message);
                console.log('message.type:', message.type, " message.data.value:", message.data.value, " message.data.max:", message.data.max);
                if (message.type === 'status') {
                    console.log('Exec info:', message.data.status.exec_info);
                // need a good if statement here to grab the image when it's done generating
                if (message.data.status.exec_info.queue_remaining === 0) {
                    console.log('Trying to find the image with matching filename...');
                    await wait(1000);
                    const filePath = findFileWithFilename(folderPath, filename);
                    if (filePath) {
                        
                        console.log('File found:', filePath);
                        const attachment = new AttachmentBuilder(filePath, 'image.png');
                        console.log('Attachment created. Editing the reply...');
                        await interaction.editReply({ files: [attachment] });
                        console.log('Reply edited.');
                        ws.close();
                    } else {
                        console.log('File not found in the output folder.');
                    }
                }
                }
                        //const recentImage = findMostRecentImage('C:\\Users\\kajus\\Desktop\\ComfyUI_windows_portable\\ComfyUI\\output');
                        
                        //if (recentImage) {
                        //    console.log('Image found:', recentImage);
                        //    const attachment = new AttachmentBuilder(recentImage, 'image.png');
                        //    console.log('Attachment created. Editing the reply...');
                        //    await interaction.editReply({ files: [attachment] });
                        //    console.log('Reply edited.');
                        //} else {
                        //    console.log('No image found in the output folder.');
                        //}
            });
        } catch (error) {
            console.error('An error occurred:', error);
        }
    }

};
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
