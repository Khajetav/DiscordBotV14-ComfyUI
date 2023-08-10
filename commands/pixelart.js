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
        .setName('pixelart')
        .setDescription('imagines pixelated tits')
        .addStringOption(option => option.setName('prompt').setDescription('What you want to imagine').setRequired(true))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false)),
    // https://discordjs.guide/slash-commands/autocomplete.html#sending-results
    async execute(interaction) {
        // prompt is what the user types in Discord
        // can expand this later on to take style too
        const prompt = interaction.options.getString('prompt');
        const cfg = interaction.options.getNumber('cfg');
        const negative = interaction.options.getString('negative');
        console.log('Prompt received...');
        console.log(prompt);

        // deferReply is needed for when the loading time is longer than 3 seconds
        // but can edit it only once (probably can edit more than once but need some other code for it)
        await interaction.deferReply();

        // promptJson is the message that we send through API
        // we edit this with what the user has sent to the prompt and then it forwards the info to ComfyUI
        let promptJson = {
            "5": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": "tits,naked women (flat shading:1.2), (minimalist:1.4)",
                    "clip": [
                        "53",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": "text, watermark, blurry, deformed, depth of field, realistic, 3d render, outline",
                    "clip": [
                        "53",
                        1
                    ]
                },
                "class_type": "CLIPTextEncode"
            },
            "10": {
                "inputs": {
                    "add_noise": "enable",
                    "noise_seed": 48857274872740,
                    "steps": 20,
                    "cfg": 8,
                    "sampler_name": "euler_ancestral",
                    "scheduler": "normal",
                    "start_at_step": 0,
                    "end_at_step": 20,
                    "return_with_leftover_noise": "enable",
                    "model": [
                        "53",
                        0
                    ],
                    "positive": [
                        "6",
                        0
                    ],
                    "negative": [
                        "7",
                        0
                    ],
                    "latent_image": [
                        "5",
                        0
                    ]
                },
                "class_type": "KSamplerAdvanced"
            },
            "17": {
                "inputs": {
                    "samples": [
                        "10",
                        0
                    ],
                    "vae": [
                        "57",
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
            "53": {
                "inputs": {
                    "lora_name": "pixel-art-xl-v1.1.safetensors",
                    "strength_model": 1.0000000000000002,
                    "strength_clip": 1,
                    "model": [
                        "57",
                        0
                    ],
                    "clip": [
                        "57",
                        1
                    ]
                },
                "class_type": "LoraLoader"
            },
            "57": {
                "inputs": {
                    "ckpt_name": "xl6HEPHAISTOSSD10XLSFW_v10.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            }
        };

        // this is how we change parts of the Json
        promptJson["6"]["inputs"]["text"] = prompt;
        const randomInt = Math.floor(Math.random() * 10000001);
        promptJson["10"]["inputs"]["noise_seed"] = randomInt;
        if (cfg != null) {
            promptJson["10"]["inputs"]["cfg"] = cfg;
        }
        if (negative != null) {
            promptJson["7"]["inputs"]["text"] = negative;
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
