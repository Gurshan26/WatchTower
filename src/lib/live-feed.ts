import { EventEmitter } from 'events';

const feedEmitter = new EventEmitter();
feedEmitter.setMaxListeners(200);

export interface LiveFeedEvent {
  type: string;
  [key: string]: unknown;
}

export function emitToLiveFeed(event: LiveFeedEvent): void {
  feedEmitter.emit('event', { ...event, timestamp: Date.now() });
}

export function subscribeToFeed(handler: (event: LiveFeedEvent) => void): () => void {
  feedEmitter.on('event', handler);
  return () => feedEmitter.off('event', handler);
}
