import { secrets } from '@core/config';
import { Injectable, Logger } from '@nestjs/common';
import { AccessToken, TrackSource } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  readonly logger = new Logger(LiveKitService.name);

  async generateToken(
    roomId: string,
    userId: string,
    username: string,
  ): Promise<string> {
    try {
      const at = new AccessToken(
        secrets.livekit.apiKey,
        secrets.livekit.apiSecret,
        {
          identity: userId,
          name: username,
        },
      );

      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: true,
        canSubscribe: true,
        canPublishSources: [TrackSource.CAMERA, TrackSource.SCREEN_SHARE],
      });

      const token = await at.toJwt();
      this.logger.log(
        `Generated livekit token for user ${username} in room ${roomId}`,
      );
      return token;
    } catch (error) {
      this.logger.error('Failed to generate LiveKit token', error);
      throw new Error('Could not generate video room token');
    }
  }
}
