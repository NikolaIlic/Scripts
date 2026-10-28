import { ConnectorsRayfinClient } from '@microsoft/rayfin-client/experimental';
import { fabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';

import type { DataAppSchema } from '../../rayfin/data/schema';
import type { AppConnectorsSchema } from '../../rayfin/connectors/schema';

let client: ConnectorsRayfinClient<
  DataAppSchema,
  Record<string, never>,
  AppConnectorsSchema
> | null = null;

export interface RayfinBootstrapConfig {
  baseUrl: string;
  publishableKey: string;
}

export function initRayfinClient(config: RayfinBootstrapConfig) {
  if (!client) {
    client = new ConnectorsRayfinClient<
      DataAppSchema,
      Record<string, never>,
      AppConnectorsSchema
    >(
    {
      baseUrl: config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`,
      publishableKey: config.publishableKey,
      useProxy: false,
      authStorage: true,
      // Rayfin 1.36+: every connector in AppConnectorsSchema needs a routing entry here.
      connectors: { matchModel: { connector: 'fabric-semanticmodel' } },
    },
    // Runtime hooks for the semantic model connector. The model target comes from
    // rayfin/rayfin.yml on the server, so no options are needed here.
    { matchModel: fabricSemanticModel() });
  }
  return client;
}

export function getRayfinClient() {
  if (!client) {
    throw new Error('Rayfin client not initialized - call initRayfinClient() first.');
  }
  return client;
}
