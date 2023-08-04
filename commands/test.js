// will try to make a more beautiful bot UI from this
const { SlashCommandBuilder, EmbedBuilder, Client, Intents, PermissionBitField, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    //
    // Discord slash command stuff
    // slash commands CAN NOT be uppercase or they fail the regex
    //
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('UI testing')
        .addStringOption(option => option.setName('testprompt').setDescription('testing for embeds').setRequired(false))
        .addStringOption(option => option.setName('hey').setDescription('hello').setRequired(false).setAutocomplete(true)),
    // https://discordjs.guide/slash-commands/autocomplete.html#sending-results
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        try {
            const choices = ["hey", "hello"];
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
        } catch (error) {
            console.error('Error:', error);
        }
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        let testPrompt = interaction.options.getString('testprompt');
        console.log("Prompt entered:" + testPrompt);
        //let fields = [
        //    { name: "this is also a test", value: "example value" },
        //];

        const button = new ActionRowBuilder()
            .addComponents
            (
                new ButtonBuilder()
                    .setCustomId('repeat')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dm')
                    .setEmoji('📩')
                    //.setEmoji(`:envelope:`)
                    .setStyle(ButtonStyle.Secondary),
        )


        if (!testPrompt) {
            testPrompt = "no prompt";
        }

        await interaction.editReply("Your image is being generated...");

        setTimeout(async () => {
            await interaction.deleteReply();
            //const followUpMessage = await interaction.followUp(
            //await interaction.user.send(
            await interaction.channel.send(
                {
                    content: `<@${interaction.user.id}>` + ", your image is here!",
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Your prompt: " + testPrompt)
                            .setImage('https://i.etsystatic.com/25272370/r/il/d3bc7b/3649789967/il_570xN.3649789967_nakt.jpg'),  
                            //.addFields(testPrompt),
                    ],
                    //fetchReply: true
                    components: [button]
                }
            );
            //const channel = interaction.channel;
            //const message = await channel.messages.fetch(followUpMessage.id);
            //await message.react('🔁');
        }, 1000);
        const collector = await interaction.channel.createMessageComponentCollector();

        collector.on('collect', async (i) => {
            console.log("Entering collector...");
            console.log("customID: " + interaction.customId);
            await i.deferReply({ ephemeral: true });
            if (i.customId === 'dm') {
                await i.user.send(
                    {
                        content: `<@${interaction.user.id}>` + ", your image is here!",
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Your prompt: " + testPrompt)
                                .setImage('https://i.etsystatic.com/25272370/r/il/d3bc7b/3649789967/il_570xN.3649789967_nakt.jpg'),
                        ],
                    }
                );
                await i.deleteReply();
            } else if (i.customId === 'repeat') {
                //const followUpMessage = await interaction.followUp(
                await i.followUp(
                    {
                        content: `<@${interaction.user.id}>` + ", your image is here!",
                        embeds: [
                            new EmbedBuilder()
                                .setTitle("Your prompt: " + testPrompt)
                                .setImage('https://i.etsystatic.com/25272370/r/il/d3bc7b/3649789967/il_570xN.3649789967_nakt.jpg'),
                            //.addFields(testPrompt),
                        ],
                        //fetchReply: true
                        components: [button]
                    }
                );
                await i.deleteReply();
            }
            //await i.deleteReply();
        })
    }
};