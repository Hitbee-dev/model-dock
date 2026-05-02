export type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type ObjectDescriptor = {
  key: string;
  contentType: string;
  byteLength: number;
  checksumSha256?: string;
};

export type PutObjectRequest = ObjectDescriptor & {
  body: Uint8Array;
};

export type PresignRequest = {
  key: string;
  expiresInSeconds: number;
};

export type ObjectStorageClient = {
  putObject(request: PutObjectRequest): Promise<ObjectDescriptor>;
  getObject(key: string): Promise<Uint8Array>;
  deleteObject(key: string): Promise<void>;
  createPresignedGetUrl(request: PresignRequest): Promise<string>;
};

export type ObjectStorageProvider = "seaweedfs" | "minio" | "garage" | "aws-s3" | "custom-s3";

export function redactObjectStorageConfig(config: ObjectStorageConfig): Omit<ObjectStorageConfig, "secretAccessKey"> {
  return {
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    forcePathStyle: config.forcePathStyle
  };
}

export function defaultObjectStorageProvider(): ObjectStorageProvider {
  return "seaweedfs";
}
