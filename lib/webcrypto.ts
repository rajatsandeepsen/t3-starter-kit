import { TextDecoder, TextEncoder } from 'node:util';
import { env } from '@/env';
import type { JWT, JWTDecodeParams, JWTEncodeParams } from 'next-auth/jwt';

const secret = env.NEXTAUTH_SECRET;

async function generateSecretKey() {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function encode({
  token,
  secret,
}: JWTEncodeParams): Promise<string> {
  const secretKey = await generateSecretKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(token));
  const signature = await crypto.subtle.sign('HMAC', secretKey, data);
  return `${Buffer.from(data).toString('base64')}.${Buffer.from(
    signature
  ).toString('base64')}`;
}

export async function decode({
  token,
  secret,
}: JWTDecodeParams): Promise<JWT | null> {
  if (!token) return null;
  const secretKey = await generateSecretKey();
  const [data, signature] = token
    .split('.')
    .map((part) => Buffer.from(part, 'base64'));
  const isValid = await crypto.subtle.verify(
    'HMAC',
    secretKey,
    signature as ArrayBuffer,
    data as ArrayBuffer
  );
  if (!isValid) return null;
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(data));
}
