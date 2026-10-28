import type { FabricSemanticModel } from '@microsoft/rayfin-connector-fabric-semanticmodel';
/**
 * Connector instances declared in `rayfin/rayfin.yml`.
 *
 * `matchModel` points at the DirectQuery semantic model over the football Eventhouse.
 * Workspace and item ids live in the YAML only - the browser never sees them.
 */
export type AppConnectorsSchema = {
    matchModel: FabricSemanticModel<'executeQuery'>;
};
