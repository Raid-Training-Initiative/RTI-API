export interface IDiscordAuthConfig {
    clientId: string,
    clientSecret: string,
}

export interface IConfig {
    db: string;
    guildId: string;
    clientsFile: string;
    cors?: boolean;
    discordAuth?: IDiscordAuthConfig;
}
