/* eslint-disable @typescript-eslint/no-explicit-any */
import * as YeelightTypes from './yeelight-types';

export function isCommandResponse(obj: any): obj is YeelightTypes.CommandResponse {
  if (typeof obj.id !== 'number') {
    return false;
  }
  if ('result' in obj) {
    if (!Array.isArray(obj.result)) {
      return false;
    }
    for (const i of obj.result) {
      if (typeof i !== 'string') {
        return false;
      }
    }
  } else if ('error' in obj) {
    if (typeof obj.error.code !== 'number') {
      return false;
    }
    if (typeof obj.error.message !== 'string') {
      return false;
    }
  } else {
    return false;
  }

  return true;
}

export function isNotificationMessage(obj: any): obj is YeelightTypes.NotificationMessage {
  if (!('method' in obj)) {
    return false;
  }
  if (!YeelightTypes.NOTIFICATION_METHODS.includes(obj.method)) {
    return false;
  }

  if (!('params' in obj)) {
    return false;
  }

  return true;
}
