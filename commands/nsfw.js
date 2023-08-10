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
        .setName('nsfw')
        .setDescription('imagines tits')
        .addStringOption(option => option.setName('prompt').setDescription('What you want to imagine').setRequired(true))
        .addStringOption(option => option.setName('lora').setDescription('Special action').setRequired(false).setAutocomplete(true))
        .addNumberOption(option => option.setName('cfg').setDescription('How strong is the prompt').setRequired(false))
        .addStringOption(option => option.setName('negative').setDescription('The negative prompt').setRequired(false))
        .addStringOption(option => option.setName('style').setDescription('Style of the picture').setRequired(false).setAutocomplete(true)),
    // https://discordjs.guide/slash-commands/autocomplete.html#sending-results
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const focusedOption = interaction.options.getFocused(true);
        let choices;
        const jsonFilePath = 'C:/Users/kajus/Desktop/ComfyUI_windows_portable/ComfyUI/custom_nodes/sdxl_prompt_styler/sdxl_styles.json';
        try {
            //const choices = ['sai-base', 'sai-3d-model', 'sai-lowpoly'];
            if (focusedOption.name === 'style') {
                const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
                const data = JSON.parse(jsonData);
                choices = data.map(item => item.name);
            }

            if (focusedOption.name === 'lora') {
                choices = ['ahegao', 'blowjob', 'chalkdust', 'cum', 'doggy', 'greg', 'icons', 'logo', 'penis', 'titsout', 'topless'];
            }
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
        } catch (error) {
            console.error('Error reading/parsing the JSON file:', error);
        }
    },
    async execute(interaction) {
        // prompt is what the user types in Discord
        // can expand this later on to take style too
        let prompt = interaction.options.getString('prompt');
        const cfg = interaction.options.getNumber('cfg');
        const negative = interaction.options.getString('negative');
        const style = interaction.options.getString('style');
        const lora = interaction.options.getString('lora');
        console.log('Prompt received...');
        console.log(prompt);

        // deferReply is needed for when the loading time is longer than 3 seconds
        // but can edit it only once (probably can edit more than once but need some other code for it)
        await interaction.deferReply();

        // promptJson is the message that we send through API
        // we edit this with what the user has sent to the prompt and then it forwards the info to ComfyUI
        let promptJson = {
            "3": {
                "inputs": {
                    "seed": 448867526498324,
                    "steps": 20,
                    "cfg": 8,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1,
                    "model": [
                        "10",
                        0
                    ],
                    "positive": [
                        "19",
                        0
                    ],
                    "negative": [
                        "20",
                        0
                    ],
                    "latent_image": [
                        "5",
                        0
                    ]
                },
                "class_type": "KSampler"
            },
            "5": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "8": {
                "inputs": {
                    "samples": [
                        "3",
                        0
                    ],
                    "vae": [
                        "15",
                        2
                    ]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "lora_name": "chalkdust.safetensors",
                    "strength_model": 1,
                    "strength_clip": 1,
                    "model": [
                        "15",
                        0
                    ],
                    "clip": [
                        "15",
                        1
                    ]
                },
                "class_type": "LoraLoader"
            },
            "15": {
                "inputs": {
                    "ckpt_name": "xl6HEPHAISTOSSD10XLSFW_v10.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "18": {
                "inputs": {
                    "text_positive": "positive prompt",
                    "text_negative": "negative prompt",
                    "style": "sai-base",
                    "log_prompt": "No"
                },
                "class_type": "SDXLPromptStyler"
            },
            "19": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "crop_w": 0,
                    "crop_h": 0,
                    "target_width": 1024,
                    "target_height": 1024,
                    "text_g": [
                        "18",
                        0
                    ],
                    "text_l": "positive prompt",
                    "clip": [
                        "10",
                        1
                    ]
                },
                "class_type": "CLIPTextEncodeSDXL"
            },
            "20": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "crop_w": 0,
                    "crop_h": 0,
                    "target_width": 1024,
                    "target_height": 1024,
                    "text_g": [
                        "18",
                        1
                    ],
                    "text_l": "negative prompt",
                    "clip": [
                        "10",
                        1
                    ]
                },
                "class_type": "CLIPTextEncodeSDXL"
            }
        };

        // this is how we change parts of the Json
        switch (lora) {
            case 'doggy':
                prompt += ", dggy, girl, pov, penis";
                promptJson["10"]["inputs"]["lora_name"] = "doggy.safetensors";
                break;
            case 'blowjob':
                prompt += ", woman, sucking a cock";
                promptJson["10"]["inputs"]["lora_name"] = "blowjob.safetensors";
                break;
            case 'cum':
                prompt += ", woman, cum on face";
                promptJson["10"]["inputs"]["lora_name"] = "cum.safetensors";
                break;
            case 'penis':
                prompt += ", penisart, penis face, ball sack, hairy balls, penis veins, outlined, eyes, mouth, tail, arms, legs, hands, feet";
                promptJson["10"]["inputs"]["lora_name"] = "penis.safetensors";
                break;
            case 'ahegao':
                prompt += ", tongue out, ahegao, drool";
                promptJson["10"]["inputs"]["lora_name"] = "ahegao.safetensors";
                break;
            case 'topless':
                prompt += ", topless woman breasts";
                promptJson["10"]["inputs"]["lora_name"] = "topless.safetensors";
                break;
            case 'titsout':
                prompt += ", boutx clothes";
                promptJson["10"]["inputs"]["lora_name"] = "titsout.safetensors";
                break;
            case 'greg':
                prompt += ", greg rutkowski";
                promptJson["10"]["inputs"]["lora_name"] = "greg.safetensors";
                break;
            case 'chalkdust':
                prompt += ", chalkdust";
                promptJson["10"]["inputs"]["lora_name"] = "chalkdust.safetensors";
                break;
            case 'icons':
                prompt += ", icredm";
                promptJson["10"]["inputs"]["lora_name"] = "icons.safetensors";
                break;
            case 'logo':
                prompt += ", LogoRedAF";
                promptJson["10"]["inputs"]["lora_name"] = "logo.safetensors";
                break;
            default:
                prompt = prompt;
        }

        promptJson["18"]["inputs"]["text_positive"] = prompt;
        promptJson["19"]["inputs"]["text_l"] = prompt;
        const randomInt = Math.floor(Math.random() * 10000001);
        promptJson["3"]["inputs"]["seed"] = randomInt;
        if (cfg != null) {
            promptJson["3"]["inputs"]["cfg"] = cfg;
        }
        if (style != null) {
            promptJson["18"]["inputs"]["style"] = style;
        }
        if (negative != null) {
            promptJson["18"]["inputs"]["text_negative"] = negative;
            promptJson["20"]["inputs"]["text_l"] = negative;
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
        promptJson["9"]["inputs"]["filename_prefix"] = filename;
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
