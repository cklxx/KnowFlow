declare module 'msw' {
  export type HttpHandler = (...args: unknown[]) => unknown;

  export const http: {
    get: (
      path: string,
      resolver: (...args: unknown[]) => HttpResponse,
    ) => HttpHandler;
    post: (
      path: string,
      resolver: (...args: unknown[]) => Promise<HttpResponse> | HttpResponse,
    ) => HttpHandler;
  };

  export const HttpResponse: {
    json: (body: unknown, init?: ResponseInit) => Response;
  };
}

declare module 'msw/browser' {
  import type { HttpHandler } from 'msw';

  export function setupWorker(
    ...handlers: HttpHandler[]
  ): {
    start: (options?: Record<string, unknown>) => Promise<void>;
    stop: () => void;
  };
}
