/**
 * Listening Manager
 * Tracks who is listening to whom for eavesdropping on 'tell' conversations
 */
export class ListeningManager {
  // Map<listenerId, targetId>
  private listeningMap = new Map<string, string>();

  /**
   * Start listening to a target
   */
  startListening(listenerId: string, targetId: string): void {
    this.listeningMap.set(listenerId, targetId);
  }

  /**
   * Stop listening
   */
  stopListening(listenerId: string): void {
    this.listeningMap.delete(listenerId);
  }

  /**
   * Check if listener is eavesdropping on target
   */
  isListeningTo(listenerId: string, targetId: string): boolean {
    return this.listeningMap.get(listenerId) === targetId;
  }

  /**
   * Get who the listener is listening to
   */
  getListeningTarget(listenerId: string): string | undefined {
    return this.listeningMap.get(listenerId);
  }
}

// Export singleton instance
export const listeningManager = new ListeningManager();
