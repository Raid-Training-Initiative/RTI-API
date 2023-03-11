import { Snowflake, UserFlags } from "discord.js";

export default interface IDiscordUserInfo {
  id: Snowflake;
  username: string;
  discriminator: number;
  avatar: string;
  public_flags: UserFlags;
  flags: UserFlags;
  locale: string;
  mfa_enabled: boolean;
  premium_type: number;
}
