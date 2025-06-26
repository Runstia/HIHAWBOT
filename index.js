// Fichier principal du bot Discord
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Ajout pour recevoir le contenu des messages
    ]
});

const configPath = './config.json';
let config = require(configPath);

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Liste des slash commands à enregistrer
const slashCommands = [
    new SlashCommandBuilder().setName('setwelcomeimg').setDescription("Change l'image de fond de bienvenue").addStringOption(opt => opt.setName('url').setDescription('URL de l\'image').setRequired(true)),
    new SlashCommandBuilder().setName('setwelcometext').setDescription('Change le texte de bienvenue').addStringOption(opt => opt.setName('texte').setDescription('Texte de bienvenue, {user} pour le pseudo, \\n pour retour à la ligne').setRequired(true)),
    new SlashCommandBuilder().setName('setwelcomecolor').setDescription('Change la couleur du texte de bienvenue').addStringOption(opt => opt.setName('couleur').setDescription('Couleur hexadécimale, ex : #ff0000').setRequired(true)),
    new SlashCommandBuilder().setName('setwelcometextsize').setDescription('Change la taille du texte de bienvenue').addIntegerOption(opt => opt.setName('taille').setDescription('Taille du texte, ex : 28').setRequired(true)),
    new SlashCommandBuilder().setName('setwelcomeavatarsize').setDescription("Change la taille de l'avatar de bienvenue").addIntegerOption(opt => opt.setName('taille').setDescription('Taille de l\'avatar, ex : 100').setRequired(true)),
    new SlashCommandBuilder().setName('welcometest').setDescription('Teste le message de bienvenue'),
    new SlashCommandBuilder().setName('welcomehelp').setDescription('Affiche la liste des commandes de bienvenue')
].map(cmd => cmd.toJSON());

async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        // Enregistrement global (pour tous les serveurs où le bot est)
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
    } catch (error) {
        console.error(error);
    }
}

client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    await registerSlashCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const guildId = interaction.guildId;
    if (!config[guildId]) config[guildId] = { ...config.default };
    // setwelcomeimg
    if (interaction.commandName === 'setwelcomeimg') {
        config[guildId].image = interaction.options.getString('url');
        saveConfig();
        await interaction.reply('Image de fond de bienvenue mise à jour !');
    }
    // setwelcometext
    if (interaction.commandName === 'setwelcometext') {
        config[guildId].text = interaction.options.getString('texte');
        saveConfig();
        await interaction.reply('Texte de bienvenue mis à jour !');
    }
    // setwelcomecolor
    if (interaction.commandName === 'setwelcomecolor') {
        config[guildId].color = interaction.options.getString('couleur');
        saveConfig();
        await interaction.reply('Couleur du texte de bienvenue mise à jour !');
    }
    // setwelcometextsize
    if (interaction.commandName === 'setwelcometextsize') {
        const size = interaction.options.getInteger('taille');
        if (!isNaN(size) && size > 0 && size < 200) {
            config[guildId].textSize = size;
            saveConfig();
            await interaction.reply('Taille du texte de bienvenue mise à jour !');
        } else {
            await interaction.reply('Veuillez entrer une taille de texte valide (ex : 28).');
        }
    }
    // setwelcomeavatarsize
    if (interaction.commandName === 'setwelcomeavatarsize') {
        const size = interaction.options.getInteger('taille');
        if (!isNaN(size) && size > 0 && size <= 250) {
            config[guildId].avatarSize = size;
            saveConfig();
            await interaction.reply('Taille de l\'avatar de bienvenue mise à jour !');
        } else {
            await interaction.reply('Veuillez entrer une taille d\'avatar valide (ex : 100).');
        }
    }
    // welcometest
    if (interaction.commandName === 'welcometest') {
        client.emit('guildMemberAdd', interaction.member);
        await interaction.reply('Test de bienvenue envoyé !');
    }
    // welcomehelp
    if (interaction.commandName === 'welcomehelp') {
        await interaction.reply(`Commandes disponibles : (slash ou texte)\n\n` +
            `/setwelcomeimg <url> — Change l'image de fond de bienvenue\n` +
            `/setwelcometext <texte> — Change le texte de bienvenue (utilisez {user} pour le pseudo et \\n pour un retour à la ligne)\n` +
            `/setwelcomecolor <#hex> — Change la couleur du texte de bienvenue (ex : #ff0000 pour rouge)\n` +
            `/setwelcometextsize <taille> — Change la taille du texte de bienvenue (ex : 28)\n` +
            `/setwelcomeavatarsize <taille> — Change la taille de l'avatar (ex : 100)\n` +
            `/welcometest — Teste le message de bienvenue\n` +
            `/welcomehelp — Affiche cette aide`);
    }
});

client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const args = message.content.split(' ');
    const cmd = args.shift().toLowerCase();
    const guildId = message.guild.id;
    if (!config[guildId]) config[guildId] = { ...config.default };

    if (cmd === '!setwelcomeimg' && args[0]) {
        config[guildId].image = args[0];
        saveConfig();
        message.reply('Image de fond de bienvenue mise à jour !');
    }
    if (cmd === '!setwelcometext' && args.length) {
        config[guildId].text = args.join(' ');
        saveConfig();
        message.reply('Texte de bienvenue mis à jour !');
    }
    if (cmd === '!setwelcomecolor' && args[0]) {
        config[guildId].color = args[0];
        saveConfig();
        message.reply('Couleur du texte de bienvenue mise à jour !');
    }
    if (cmd === '!setwelcometextsize' && args[0]) {
        const size = parseInt(args[0]);
        if (!isNaN(size) && size > 0 && size < 200) {
            config[guildId].textSize = size;
            saveConfig();
            message.reply('Taille du texte de bienvenue mise à jour !');
        } else {
            message.reply('Veuillez entrer une taille de texte valide (ex : 28).');
        }
    }
    if (cmd === '!setwelcomeavatarsize' && args[0]) {
        const size = parseInt(args[0]);
        if (!isNaN(size) && size > 0 && size <= 250) {
            config[guildId].avatarSize = size;
            saveConfig();
            message.reply('Taille de l\'avatar de bienvenue mise à jour !');
        } else {
            message.reply('Veuillez entrer une taille d\'avatar valide (ex : 100).');
        }
    }
    if (cmd === '!welcomehelp') {
        message.reply(`Commandes disponibles : (ne pas mettre les <>)\n\n` +
            `!setwelcomeimg <url> — Change l'image de fond de bienvenue\n` +
            `!setwelcometext <texte> — Change le texte de bienvenue (utilisez {user} pour le pseudo et \\n pour un retour à la ligne)\n` +
            `!setwelcomecolor <#hex> — Change la couleur du texte de bienvenue (ex : #ff0000 pour rouge)\n` +
            `!setwelcometextsize <taille> — Change la taille du texte de bienvenue (ex : 28)\n` +
            `!setwelcomeavatarsize <taille> — Change la taille de l'avatar (ex : 100)\n` +
            `!welcometest — Teste le message de bienvenue\n` +
            `!welcomehelp — Affiche cette aide`);
    }
    if (cmd === '!welcometest') {
        // Simule l'arrivée de l'auteur du message
        client.emit('guildMemberAdd', message.member);
        message.reply('Test de bienvenue envoyé !');
    }
});

client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'général');
    if (!channel) return;
    const guildId = member.guild.id;
    if (!config[guildId]) config[guildId] = { ...config.default };
    const { image, text, color } = config[guildId];

    // Récupérer les tailles personnalisées ou valeurs par défaut
    const textSize = config[guildId].textSize || 28;
    const avatarSize = config[guildId].avatarSize || 200;

    // Paramètres de l'image
    const width = 700;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Charger le fond
    const background = await loadImage(image);
    ctx.drawImage(background, 0, 0, width, height);

    // Charger l'avatar
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(125, 125, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 125 - avatarSize / 2, 125 - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();

    // Texte de bienvenue (ligne 1 personnalisable)
    ctx.font = `bold ${textSize}px Sans`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const textLines = text.replace('{user}', member.user.username).split(/\n|\n/);
    if (textLines.length === 1) {
        ctx.fillText(textLines[0], 450, 145);
    } else {
        ctx.fillText(textLines[0], 450, 120);
        ctx.font = `bold ${textSize + 4}px Sans`;
        ctx.fillText(textLines[1], 450, 170);
    }

    // Envoyer l'image
    const { AttachmentBuilder } = require('discord.js');
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
    channel.send({ content: `Bienvenue ${member}!!!`, files: [attachment] });
});

// Petit serveur web pour keepalive
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('je suis alive!');
}).listen(process.env.PORT || 3000);

// Keepalive : ping le serveur web toutes les 5 minutes
setInterval(() => {
    require('http').get('http://localhost:' + (process.env.PORT || 3000));
}, 5 * 60 * 1000);

client.login(process.env.TOKEN);
