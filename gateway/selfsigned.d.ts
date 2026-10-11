declare module "selfsigned" {
  export interface GenerateOptions {
    days?: number;
    keySize?: number;
    [key: string]: unknown;
  }
  export interface SelfSignedPems {
    private: string;
    public: string;
    cert: string;
    fingerprint?: string;
  }
  export function generate(attrs: Array<{ name: string; value: string }>, options?: GenerateOptions): SelfSignedPems;
}
