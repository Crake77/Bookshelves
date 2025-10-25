/**
 * Object storage abstraction for optional full content storage
 * Currently a stub - can be implemented later if needed
 */

export type ObjectStoreConfig = {
  kind: 'none' | 's3' | 'r2';
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export class ObjectStore {
  constructor(private config: ObjectStoreConfig) {}
  
  /**
   * Upload content and return object URI
   * @returns URI like "s3://bucket/key" or null if storage disabled
   */
  async upload(key: string, content: Buffer | string): Promise<string | null> {
    if (this.config.kind === 'none') {
      return null;
    }
    
    // TODO: Implement S3/R2 upload when needed
    throw new Error('Object storage not yet implemented');
  }
  
  /**
   * Download content from object URI
   */
  async download(uri: string): Promise<Buffer> {
    if (this.config.kind === 'none') {
      throw new Error('Object storage is disabled');
    }
    
    // TODO: Implement S3/R2 download when needed
    throw new Error('Object storage not yet implemented');
  }
  
  /**
   * Check if object storage is enabled
   */
  isEnabled(): boolean {
    return this.config.kind !== 'none';
  }
}

/**
 * Create object store from environment variables
 */
export function createObjectStore(): ObjectStore {
  const config: ObjectStoreConfig = {
    kind: (process.env.OBJECT_STORE_KIND as any) || 'none',
    bucket: process.env.OBJECT_STORE_BUCKET,
    region: process.env.OBJECT_STORE_REGION,
    accessKeyId: process.env.OBJECT_STORE_ACCESS_KEY_ID,
    secretAccessKey: process.env.OBJECT_STORE_SECRET_ACCESS_KEY,
  };
  
  return new ObjectStore(config);
}
