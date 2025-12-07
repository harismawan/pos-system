import '../testSetup.js';
import { describe, it, expect } from 'bun:test';
import { compression, compress } from '../../src/libs/compression.js';

function createAppHarness() {
    const callbacks = [];
    const app = {
        onAfterHandle(cb) {
            callbacks.push(cb);
            return this;
        },
    };
    compression(app);
    return callbacks[0];
}

describe('libs/compression', () => {
    it('handles Capitalized Content-Type header', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test', {
            headers: { 'accept-encoding': 'gzip' },
        });
        const set = { headers: { 'Content-Type': 'application/json' } };
        const response = 'x'.repeat(1500);

        const result = await handler({ request, set, response });
        expect(result.headers.get('content-encoding')).toBe('gzip');
    });

    it('returns null/falsy response as is', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test');
        const set = { headers: {} };
        const result = await handler({ request, set, response: null });
        expect(result).toBeNull();
    });

    it('compresses large gzip-eligible responses', async () => {
        const handler = createAppHarness();

        const request = new Request('http://localhost/test', {
            headers: { 'accept-encoding': 'gzip' },
        });
        const set = { headers: { 'content-type': 'application/json' } };
        const response = 'x'.repeat(1500);

        const result = await handler({ request, set, response });

        expect(result instanceof Response).toBe(true);
        expect(result.headers.get('content-encoding')).toBe('gzip');
        expect(result.headers.get('content-type')).toBe('application/json');
        expect(result.headers.get('vary')).toBe('Accept-Encoding');
    });

    it('skips compression for small bodies', async () => {
        const handler = createAppHarness();

        const request = new Request('http://localhost/test', {
            headers: { 'accept-encoding': 'gzip' },
        });
        const set = { headers: { 'content-type': 'application/json' } };
        const response = 'tiny';

        const result = await handler({ request, set, response });

        expect(result).toBe(response);
    });

    it('returns original response when no accept-encoding', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test');
        const set = { headers: { 'content-type': 'application/json' } };
        const response = 'x'.repeat(2000);
        const result = await handler({ request, set, response });
        expect(result).toBe(response);
    });

    it('handles deflate encoding and stringified objects', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test', {
            headers: { 'accept-encoding': 'deflate' },
        });
        const set = { headers: { 'content-type': 'application/json' } };
        const response = { message: 'hello'.repeat(300) };
        const result = await handler({ request, set, response });
        expect(result.headers.get('content-encoding')).toBe('deflate');
    });

    it('skips when response already compressed', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test', {
            headers: { 'accept-encoding': 'gzip' },
        });
        const set = { headers: { 'content-encoding': 'gzip' } };
        const response = 'x'.repeat(2000);
        const result = await handler({ request, set, response });
        expect(result).toBe(response);
    });

    it('skips when content-type is not compressible', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test', { headers: { 'accept-encoding': 'gzip' } });
        const set = { headers: { 'content-type': 'image/png' } };
        const response = 'y'.repeat(2000);
        const result = await handler({ request, set, response });
        expect(result).toBe(response);
    });

    it('returns original when encoding is unsupported', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test', { headers: { 'accept-encoding': 'br' } });
        const set = { headers: { 'content-type': 'application/json' } };
        const response = 'z'.repeat(2000);
        const result = await handler({ request, set, response });
        expect(result).toBe(response);
    });

    it('returns original buffer when non-string/object response provided', async () => {
        const handler = createAppHarness();
        const request = new Request('http://localhost/test', { headers: { 'accept-encoding': 'gzip' } });
        const set = { headers: { 'content-type': 'application/json' } };
        const bufferResponse = Buffer.from('buffer-content');
        const result = await handler({ request, set, response: bufferResponse });
        expect(result).toBe(bufferResponse);
    });

    it('compress helper returns deflate buffer when encoding matches', () => {
        const input = Buffer.from('hello');
        const out = compress(input, 'deflate');
        expect(out).toBeInstanceOf(Buffer);
        expect(out).not.toBe(input);
    });

    it('compress helper returns original buffer on unknown encoding', () => {
        const input = 'hello';
        const out = compress(input, 'br');
        expect(out).toBeInstanceOf(Buffer);
        expect(out.toString()).toBe('hello');
    });
});
