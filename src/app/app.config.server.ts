import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { FetchBackend, HttpBackend } from '@angular/common/http';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    // Native fetch only during static rendering; browser HTTP/auth behavior is unchanged.
    FetchBackend,
    { provide: HttpBackend, useExisting: FetchBackend },
    provideServerRendering(withRoutes(serverRoutes))
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
