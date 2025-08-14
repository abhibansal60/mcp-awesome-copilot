export interface HandshakeResponse {
  serverVersion: string;
  protocolVersions: string[]; // e.g., ["1.0"]
  capabilities: string[]; // e.g., ["listItems", "search", "install"]
}
