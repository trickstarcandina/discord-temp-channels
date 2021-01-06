import { Client, Snowflake, GuildChannel, Collection } from 'discord.js';
import { EventEmitter } from 'events';

import { ParentChannelData, ParentChannelOptions } from './types';
import {
  handleChannelDelete,
  handleVoiceStateUpdate,
  handleChannelUpdate,
  handleTextCreation,
  handleRegistering,
} from './handlers';

/**
 *The temporary channels manager.
 * @export
 * @class TempChannelsManager
 * @extends {EventEmitter}
 */
class TempChannelsManager extends EventEmitter {
  /**
   *The client instance.
   * @type {Client}
   * @memberof TempChannelsManager
   */
  public client: Client;

  /**
   *The collection of registered parent channels.
   * @type {Collection<Snowflake, ParentChannelData>}
   * @memberof TempChannelsManager
   */
  public channels: Collection<Snowflake, ParentChannelData>;

  /**
   *Creates an instance of TempChannelsManager.
   * @param {Client} client
   * @memberof TempChannelsManager
   */
  constructor(client: Client) {
    super();

    this.channels = new Collection();
    this.client = client;

    this.client.on('voiceStateUpdate', async (oldState, newState) => handleVoiceStateUpdate(this, oldState, newState));
    this.client.on('channelUpdate', async (oldState, newState) => handleChannelUpdate(this, oldState as GuildChannel, newState as GuildChannel));
    this.client.on('channelDelete', async channel => handleChannelDelete(this, channel as GuildChannel));
    
    this.on('channelRegister', async (parent) => handleRegistering(this, parent));
    this.on('createText', async (message) => handleTextCreation(this, message));
  }

  /**
   *Registers a parent channel. When a user joins a it, a child will be created and they will be moved to it.
   *
   * @param {Snowflake} channelID
   * @param {ParentChannelOptions} [options={
   *       childCategory: null,
   *       childAutoDelete: true,
   *       childAutoDeleteIfOwnerLeaves: false,
   *       childFormat: (name, count) => `[DRoom #${count}] ${name}`,
   *       childFormatRegex: /^\[DRoom #\d+\]\s+.+/i,
   *       childPermissionOverwriteOption: { MANAGE_CHANNELS: true }
   *     }]
   * @memberof TempChannelsManager
   */
  registerChannel(
    channelID: Snowflake,
    options: ParentChannelOptions = {
      childCategory: null,
      childAutoDelete: true,
      childAutoDeleteIfOwnerLeaves: false,
      childVoiceFormat: (name, count) => `[DRoom #${count}] ${name}`,
      childVoiceFormatRegex: /^\[DRoom #\d+\]\s+.+/i,
      childTextFormat: (name, count) => `droom-${count}_${name}`,
      childTextFormatRegex: /^droom-\d+_/i,
      childPermissionOverwriteOption: { MANAGE_CHANNELS: true }
    }
  ) {
    const channelData: ParentChannelData = { channelID, options, children: [] };
    this.channels.set(channelID, channelData);
    this.emit('channelRegister', channelData);
  }

  /**
   *Unregisters a parent channel. When a user joins it, nothing will happen.
   *
   * @param {Snowflake} channelID
   * @returns
   * @memberof TempChannelsManager
   */
  unregisterChannel(channelID: Snowflake) {
    const channel = this.channels.get(channelID);
    const isDeleted = this.channels.delete(channelID);
    if (isDeleted) {
      return this.emit('channelUnregister', channel);
    }

    return this.emit('error', null, `There is no channel with the id ${channelID}`);
  }
}

export = TempChannelsManager;
