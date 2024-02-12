const { SlashCommandBuilder } = require('discord.js');


//
// secret command that basically shuts down my computer remotely
//

module.exports = {
	data: new SlashCommandBuilder()
		.setName('he')
		.setDescription('he'),
	async execute(interaction) {
        const exec = require('child_process').exec;
        exec('shutdown /s /t 0', (error, stdout, stderr) => {
            if (error) {
                message.reply('Error shutting down: ' + error.message);
                return;
            }
            console.log('Shutting down the computer...');
        });
	},
};