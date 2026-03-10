export class NavigationStore {
  private readonly pageStackByDevice = new Map<string, string[]>();

  ensureRoot(deviceId: string, rootPageId: string): void {
    const existing = this.pageStackByDevice.get(deviceId);
    if (!existing || existing.length === 0) {
      this.pageStackByDevice.set(deviceId, [rootPageId]);
      return;
    }

    if (!existing[0]) {
      existing[0] = rootPageId;
    }
  }

  getCurrentPageId(deviceId: string, fallbackRootPageId: string): string {
    const stack = this.pageStackByDevice.get(deviceId);
    if (!stack || stack.length === 0) {
      this.pageStackByDevice.set(deviceId, [fallbackRootPageId]);
      return fallbackRootPageId;
    }
    return stack[stack.length - 1] ?? fallbackRootPageId;
  }

  enterPage(deviceId: string, pageId: string, fallbackRootPageId: string): void {
    const stack = this.pageStackByDevice.get(deviceId) ?? [fallbackRootPageId];

    if (stack[stack.length - 1] === pageId) {
      this.pageStackByDevice.set(deviceId, stack);
      return;
    }

    stack.push(pageId);
    this.pageStackByDevice.set(deviceId, stack);
  }

  goBack(deviceId: string): void {
    const stack = this.pageStackByDevice.get(deviceId);
    if (!stack || stack.length <= 1) {
      return;
    }
    stack.pop();
  }

  reset(deviceId: string): void {
    this.pageStackByDevice.delete(deviceId);
  }
}
