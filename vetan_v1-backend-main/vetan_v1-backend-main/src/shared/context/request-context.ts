import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  requestId: string;
  tenantId?: string;
  userId?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function setRequestContext(partial: Partial<RequestContextStore>) {
  const store = requestContext.getStore();
  if (store) {
    Object.assign(store, partial);
  }
}
