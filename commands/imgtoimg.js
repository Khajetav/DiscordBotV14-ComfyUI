const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs'); // Import the fs module
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { randomInt } = require('crypto');

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
        const fs = require('fs');
        const prompt = interaction.options.getString('prompt');
        const negative = interaction.options.getString('negative');
        const cfg = interaction.options.getNumber('cfg');
        const noise = interaction.options.getNumber('noise');
        const attachment = interaction.options.getAttachment('image');
        const style = interaction.options.getString('style');
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
        const fileData = await fetch(attachment.url).then(res => res.arrayBuffer());

        // Convert the ArrayBuffer to a Buffer
        const bufferData = Buffer.from(fileData);
        // C:\Users\kajus\Desktop\ComfyUI_windows_portable\ComfyUI\input
        const filePath = `C:/Users/kajus/Desktop/ComfyUI_windows_portable/ComfyUI/input/${filename}.png`;
        try {
            // Save the image file to a temporary location

            fs.writeFile(filePath, bufferData, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`File saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('An error occurred:', error);
        }
        console.log('Prompt received...');
        console.log(prompt);

        // deferReply is needed for when the loading time is longer than 3 seconds
        // but can edit it only once (probably can edit more than once but need some other code for it)
        await interaction.deferReply();
        // promptJson is the message that we send through API
        // we edit this with what the user has sent to the prompt and then it forwards the info to ComfyUI
        let promptJson = {
            "1": {
                "inputs": {
                    "ckpt_name": "xl6HEPHAISTOSSD10XLSFW_v10.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "2": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "crop_w": 0,
                    "crop_h": 0,
                    "target_width": 1024,
                    "target_height": 1024,
                    "text_g": [
                        "20",
                        0
                    ],
                    "text_l": "positive prompt",
                    "clip": [
                        "1",
                        1
                    ]
                },
                "class_type": "CLIPTextEncodeSDXL"
            },
            "4": {
                "inputs": {
                    "width": 1024,
                    "height": 1024,
                    "crop_w": 0,
                    "crop_h": 0,
                    "target_width": 1024,
                    "target_height": 1024,
                    "text_g": [
                        "20",
                        1
                    ],
                    "text_l": "negative prompt",
                    "clip": [
                        "1",
                        1
                    ]
                },
                "class_type": "CLIPTextEncodeSDXL"
            },
            "6": {
                "inputs": {
                    "seed": 304882005656735,
                    "steps": 20,
                    "cfg": 8,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 0.95,
                    "model": [
                        "1",
                        0
                    ],
                    "positive": [
                        "2",
                        0
                    ],
                    "negative": [
                        "4",
                        0
                    ],
                    "latent_image": [
                        "13",
                        0
                    ]
                },
                "class_type": "KSampler"
            },
            "8": {
                "inputs": {
                    "samples": [
                        "6",
                        0
                    ],
                    "vae": [
                        "1",
                        2
                    ]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "PreviewImage"
            },
            "11": {
                "inputs": {
                    "image": "2023-07-31_22-56-22-353.png",
                    "choose file to upload": "image"
                },
                "class_type": "LoadImage"
            },
            "12": {
                "inputs": {
                    "side_length": 1024,
                    "side": "Longest",
                    "upscale_method": "nearest-exact",
                    "crop": "disabled",
                    "image": [
                        "11",
                        0
                    ]
                },
                "class_type": "Image scale to side"
            },
            "13": {
                "inputs": {
                    "pixels": [
                        "12",
                        0
                    ],
                    "vae": [
                        "1",
                        2
                    ]
                },
                "class_type": "VAEEncode"
            },
            "14": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage"
            },
            "20": {
                "inputs": {
                    "text_positive": "positive prompt",
                    "text_negative": "negative prompt",
                    "style": "sai-base",
                    "log_prompt": "No"
                },
                "class_type": "SDXLPromptStyler"
            }
        };

        // this is how we change parts of the Json
        console.log("Trying to change the prompt now...");
        console.log(prompt)
        promptJson["20"]["inputs"]["text_positive"] = prompt;
        promptJson["2"]["inputs"]["text_l"] = prompt;
        // const randomInt = Math.floor(Math.random() * 10000001);
        const randomSeed = generateRandomSeed();
        console.log(randomSeed);
        promptJson["6"]["inputs"]["seed"] = randomSeed;
        //promptJson["6"]["inputs"]["denoise"] = noise;
        promptJson["11"]["inputs"]["image"] = filePath;
        if (negative != null) {
            promptJson["20"]["inputs"]["text_negative"] = negative;
            promptJson["4"]["inputs"]["text_l"] = negative;
        }
        if (cfg != null) {
            promptJson["6"]["inputs"]["cfg"] = cfg;
        }
        if (noise != null) {
            promptJson["6"]["inputs"]["denoise"] = noise;
        }
        if (style != null) {
            console.log('THIS IS THE STYLE THAT WE SEE');
            console.log(style);
            promptJson["20"]["inputs"]["style"] = style;
        }
        // format the date as a string (YYYY-MM-DD_HH-mm-ss)
        // we use this to give an unique name to files

        // set the filename prefix
        promptJson["14"]["inputs"]["filename_prefix"] = filename;
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

function generateRandomSeed() {
    const originalSeed = 1041787352747838;
    const numberOfDigits = originalSeed.toString().length;

    const min = Math.pow(10, numberOfDigits - 1);
    const max = Math.pow(10, numberOfDigits) - 1;

    return Math.floor(Math.random() * (max - min + 1) + min);
}

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
